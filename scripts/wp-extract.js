/**
 * WordPress -> JSON extractor for the ClearView awards/events migration.
 *
 * Paste the whole file into the browser console on clearviewpublishing.com/wp-admin,
 * under the logged-in editor session. It starts immediately and downloads one
 * wp-source.json holding all five CPTs. Put that file in .migration-source/.
 *
 * Reads only: every request is a GET against a list or edit screen. Nothing is
 * written, published or activated.
 *
 * Why the edit screen and not the REST API or a WXR export:
 *   - the events/companies/people/acclaim/resources CPTs are not REST-exposed
 *   - Tools -> Export needs the `export` capability, which editor does not have
 *   - the edit form carries values for both ACF and Pods fields, including the
 *     bidirectional company <-> person relation that Pods keeps in wp_podsrel
 *     and that a WXR export never contains
 *
 * If Chrome refuses the paste, type `allow pasting` in the console first.
 * To re-run a single type afterwards:  await wpExtract('events')
 */

;(async () => {
  // events are already extracted; re-add 'events' here to redo them
  const POST_TYPES = ['companies', 'people', 'acclaim', 'resource']

  // Four at a time against wp-admin, GET only. Each edit screen is ~700 KB
  // because Pods embeds the full People roster in every one of them, so the
  // wall clock is dominated by transfer, not by our pacing.
  const CONCURRENCY = 8
  const DELAY_MS = 40 // small gap within a worker; concurrency does the pacing
  const RETRIES = 2 // a heavy admin screen under load can 500 transiently
  const LIST_DELAY_MS = 250 // gap between list pages
  // Runaway guard only: the walk stops on its own when a page yields no new
  // ids. Keep it far above any real count - an earlier run capped at 60 pages
  // and reported 1200 of 1200 for a CPT that actually holds 1451.
  const MAX_LIST_PAGES = 400

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
  const parse = (html) => new DOMParser().parseFromString(html, 'text/html')

  /**
   * Retries on failure, backing off, because raising concurrency trades a
   * gentler load profile for speed: a run that goes fast and silently drops
   * records is worse than a slow one.
   */
  async function get(url, attempt = 0) {
    try {
      const res = await fetch(url, { credentials: 'same-origin' })
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
      const text = await res.text()
      if (text.length < 5000) throw new Error(`подозрительно короткий ответ (${text.length} б)`)
      return text
    } catch (err) {
      if (attempt >= RETRIES) throw err
      await sleep(1200 * (attempt + 1))
      return get(url, attempt + 1)
    }
  }

  /**
   * Walk the list table pages and collect every post ID, any status.
   * Stops when a page yields no IDs we have not already seen, rather than
   * guessing at the page size: screen options can set that to anything, and
   * guessing wrong would silently truncate the run.
   */
  async function collectIds(postType) {
    const seen = new Set()
    for (let page = 1; page <= MAX_LIST_PAGES; page++) {
      const url = `/wp-admin/edit.php?post_type=${encodeURIComponent(postType)}&post_status=all&paged=${page}`
      let doc
      try {
        doc = parse(await get(url))
      } catch (err) {
        console.warn(`  список, стр. ${page}: ${err}`)
        break
      }
      const ids = [...doc.querySelectorAll('#the-list input[name="post[]"]')].map((el) => el.value)
      const fresh = ids.filter((id) => !seen.has(id))
      if (!fresh.length) break
      fresh.forEach((id) => seen.add(id))
      console.log(`  список, стр. ${page}: +${fresh.length} (всего ${seen.size})`)
      await sleep(LIST_DELAY_MS)
    }
    return [...seen]
  }

  /**
   * Read one form control into a plain value.
   * Selects keep both the stored value and the visible label, so a post_object
   * relation carries the target's title next to its ID and can be checked by eye.
   */
  function readControl(el) {
    if (el.tagName.toLowerCase() === 'select') {
      const picked = [...el.selectedOptions].map((o) => ({
        value: o.value,
        label: o.textContent.trim(),
      }))
      if (!picked.length) return null
      return el.multiple ? picked : picked[0]
    }
    if (el.type === 'checkbox' || el.type === 'radio') {
      return el.checked ? el.value : undefined // undefined = drop entirely
    }
    return el.value === '' ? null : el.value
  }

  /**
   * Pods 2.8+ renders its fields with React, so the raw HTML a fetch returns
   * carries no inputs for them - only a JSON blob per field. ACF renders
   * server-side and is read from the inputs as normal.
   *
   * The value is always `fieldValue`:
   *   scalar -> string, empty as ""
   *   file   -> attachment id, or false
   *   pick   -> array of ids, or false
   *
   * `fieldItemData` is NOT the selection. On a pick it is the entire roster of
   * choices - 1549 People on every single company page - so reading it as the
   * value would stamp the whole directory onto all 1200 records. It is used
   * here only as a lookup to put a name next to each selected id, and for a
   * file, where it does carry the attached item.
   *
   * Relations come out as {value, label}, the shape the ACF selects produce,
   * so everything downstream sees one format.
   */
  function readPodsFields(doc) {
    const out = {}
    for (const script of doc.querySelectorAll('script.pods-dfv-field-data')) {
      let j
      try {
        j = JSON.parse(script.textContent)
      } catch {
        continue
      }
      const name = j?.htmlAttr?.name
      if (!name || /^pods_meta_(nonce|pod|id|uri|form)_/.test(name)) continue

      const v = j.fieldValue
      if (v === false || v === null || v === undefined || v === '') continue

      const items = Array.isArray(j.fieldItemData) ? j.fieldItemData : []
      const labelOf = (id) => {
        const hit = items.find((it) => String(it.id) === String(id))
        return hit ? (hit.name || '').trim() : ''
      }

      if (Array.isArray(v)) {
        out[name] = v.map((id) => ({ value: String(id), label: labelOf(id) }))
      } else if (j.fieldType === 'file') {
        out[name] = [{ value: String(v), label: labelOf(v) }]
      } else {
        out[name] = v
      }
    }
    return out
  }

  /**
   * The pick roster is identical on every page, so it is captured once per run:
   * a complete id -> name list of the target CPT for the price of nothing.
   */
  function captureRosters(doc) {
    for (const script of doc.querySelectorAll('script.pods-dfv-field-data')) {
      let j
      try {
        j = JSON.parse(script.textContent)
      } catch {
        continue
      }
      if (j?.fieldType !== 'pick') continue
      const items = Array.isArray(j.fieldItemData) ? j.fieldItemData : []
      if (items.length < 50) continue
      const key = j.htmlAttr?.name || 'unknown'
      globalThis.WP_ROSTERS ||= {}
      if (globalThis.WP_ROSTERS[key]) continue
      globalThis.WP_ROSTERS[key] = items.map((it) => ({
        id: String(it.id),
        name: (it.name || '').trim(),
      }))
      console.log(`  справочник ${key}: ${items.length} записей`)
    }
  }

  /** Collect every ACF / Pods / taxonomy control on one edit screen. */
  function readFields(doc) {
    const out = {}
    const controls = doc.querySelectorAll(
      'input[name^="acf["], select[name^="acf["], textarea[name^="acf["],' +
        'input[name^="pods_meta_"], select[name^="pods_meta_"], textarea[name^="pods_meta_"],' +
        'input[name^="tax_input"], select[name^="tax_input"]',
    )

    for (const el of controls) {
      const name = el.name
      // ACF renders a hidden template row for every repeater; it holds no data.
      if (name.includes('acfcloneindex')) continue
      // Pods form plumbing, not content.
      if (/^pods_meta_(nonce|pod|id|uri|form)_/.test(name)) continue

      const value = readControl(el)
      if (value === undefined) continue

      if (name.endsWith('[]')) {
        if (value === null) continue
        const key = name.slice(0, -2)
        ;(out[key] ||= []).push(value)
      } else {
        // A real value beats the empty hidden input ACF emits before checkboxes.
        if (out[name] != null && value == null) continue
        out[name] = value
      }
    }
    return { ...out, ...readPodsFields(doc) }
  }

  function readCore(doc, id) {
    const val = (sel) => doc.querySelector(sel)?.value ?? null
    const pad = (n) => String(n).padStart(2, '0')
    const [mm, jj, aa, hh, mn] = ['#mm', '#jj', '#aa', '#hh', '#mn'].map(val)
    const published =
      aa && mm && jj ? `${aa}-${pad(mm)}-${pad(jj)}T${pad(hh || 0)}:${pad(mn || 0)}` : null

    return {
      id,
      postType: val('#post_type'),
      title: val('#title'),
      slug: val('#post_name'),
      status: val('#hidden_post_status') || val('#post_status'),
      published,
      thumbnailId: val('#_thumbnail_id'),
      parent: val('#parent_id'),
      content: val('#content'),
      editUrl: `/wp-admin/post.php?post=${id}&action=edit`,
    }
  }

  function download(name, data) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = name
    a.click()
    setTimeout(() => URL.revokeObjectURL(a.href), 5000)
  }

  /**
   * Every run is stashed on globalThis.WP before anything is downloaded.
   * Chrome blocks a page's second and later automatic downloads, and a blocked
   * download used to mean the whole run was lost: the console keeps only the
   * last value of a multi-statement paste. Re-download any time with wpSave().
   */
  globalThis.WP ||= {}

  async function wpExtract(postType) {
    console.log(`\n=== ${postType} ===`)
    const ids = await collectIds(postType)
    console.log(`найдено записей: ${ids.length}`)
    if (!ids.length) {
      console.warn(`  ничего не найдено — возможно, неверный slug "${postType}".`)
      console.warn('  наведите курсор на пункт меню слева и посмотрите post_type= в адресе.')
    }

    const records = []
    const failed = []
    let next = 0
    let done = 0
    let rosterTaken = false

    async function worker() {
      while (next < ids.length) {
        const id = ids[next++]
        try {
          const doc = parse(await get(`/wp-admin/post.php?post=${id}&action=edit`))
          const core = readCore(doc, id)
          if (!rosterTaken) {
            rosterTaken = true
            captureRosters(doc)
          }
          records.push({ ...core, fields: readFields(doc) })
        } catch (err) {
          failed.push({ id, error: String(err) })
        }
        done++
        if (done % 25 === 0 || done === ids.length)
          console.log(`  ${done}/${ids.length}${failed.length ? `  сбоев ${failed.length}` : ''}`)
        await sleep(DELAY_MS)
      }
    }

    await Promise.all(Array.from({ length: CONCURRENCY }, worker))
    records.sort((a, b) => ids.indexOf(a.id) - ids.indexOf(b.id))

    const payload = {
      postType,
      counts: { found: ids.length, extracted: records.length },
      failed,
      records,
    }
    globalThis.WP[postType] = payload
    console.log(
      `${postType}: готово ${records.length} из ${ids.length}` +
        (failed.length ? `, не удалось ${failed.length}` : '') +
        `  — сохранено в WP.${postType}`,
    )
    return payload
  }

  /** Download whatever has been collected so far, in one file. */
  function wpSave(name = 'wp-source.json') {
    const types = { ...globalThis.WP }
    const total = Object.values(types).reduce((n, t) => n + (t?.records?.length ?? 0), 0)
    download(name, {
      extractedAt: new Date().toISOString(),
      source: location.origin,
      types,
      rosters: globalThis.WP_ROSTERS ?? {},
    })
    console.log(
      `${name}: ${Object.entries(types)
        .map(([k, v]) => `${k} ${v?.records?.length ?? 0}`)
        .join(', ')} — всего ${total}`,
    )
  }

  globalThis.wpExtract = wpExtract
  globalThis.wpSave = wpSave

  // --- run ---------------------------------------------------------------
  console.log('Старт. Не закрывайте вкладку.\n')
  const started = Date.now()
  const out = {
    extractedAt: new Date().toISOString(),
    source: location.origin,
    types: {},
  }

  for (const t of POST_TYPES) {
    out.types[t] = await wpExtract(t)
  }

  const total = Object.values(out.types).reduce((n, t) => n + t.records.length, 0)
  const failed = Object.values(out.types).reduce((n, t) => n + t.failed.length, 0)

  console.log('\n──────────────────────────────')
  for (const [t, v] of Object.entries(out.types)) {
    console.log(`${t.padEnd(12)} ${v.records.length}`)
  }
  console.log(`итого ${total} записей за ${Math.round((Date.now() - started) / 1000)} с`)
  if (failed) console.warn(`не удалось: ${failed}`)
  console.log('──────────────────────────────')

  wpSave()
  console.log('Положите файл в .migration-source/. Всё также лежит в WP, пересохранить: wpSave()')
})()
