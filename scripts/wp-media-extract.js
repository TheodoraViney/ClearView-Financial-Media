/**
 * WordPress media resolver for the ClearView awards/events migration.
 *
 * Takes the attachment ids in .migration-source/media-manifest.json and resolves
 * each one to its real file: source URL, filename, MIME type, byte size, and the
 * alt text, title and caption WordPress holds for it.
 *
 * Paste into the browser console on clearviewpublishing.com/wp-admin under the
 * logged-in editor session, AFTER pasting .migration-source/media-ids.js. It
 * starts immediately and leaves everything on globalThis.WP_MEDIA; download with
 * wpMediaSave(). If Chrome refuses the paste, type `allow pasting` first.
 *
 *     1. paste .migration-source/media-ids.js
 *     2. paste this file
 *     3. wpMediaSave()          -> wp-media.json, put it in .migration-source/
 *
 * Reads only: every request is a GET against the REST API. Nothing is written,
 * published or activated, and no file is downloaded from the media library -
 * this run produces a list of URLs, not the bytes behind them.
 *
 * Why the cookie session and not a token:
 *   Application Passwords are disabled on the instance, so there is no token
 *   route. Cookie auth is the only one left, which is why every request carries
 *   credentials: 'same-origin'.
 *
 * Why the nonce is not optional:
 *   WordPress applies cookie authentication to a REST request ONLY when the
 *   request also carries a valid `wp_rest` nonce in X-WP-Nonce. Without it the
 *   cookies are ignored and the request is served anonymously - and anonymously
 *   this endpoint returns about 1 file in 14, because most of the library is
 *   attached to non-public posts. A run that forgets the nonce does not fail; it
 *   succeeds quietly against the wrong 7% of the corpus. findNonce() below hunts
 *   for one in four places and the run aborts if it cannot prove it is
 *   authenticated.
 *
 * Why /wp-json/wp/v2/media is used at all when the CPTs are not REST-exposed:
 *   media IS exposed. The events/companies/people/acclaim/resources CPTs are
 *   not, which is why scripts/wp-extract.js had to scrape edit screens instead.
 *
 * Why batches of 100 and not 6,648 single GETs:
 *   the collection endpoint accepts `include`, so 6,648 ids resolve in 67
 *   requests instead of 6,648. That is two orders of magnitude less load on an
 *   instance we do not yet have written permission to crawl, and it finishes in
 *   under a minute instead of a quarter of an hour. Ids the batch does not
 *   return are retried one at a time afterwards, which is where a 404 or a
 *   permission problem gets its own diagnosis.
 *
 * Why `include` is verified rather than trusted:
 *   if a security plugin strips the parameter, /wp/v2/media?per_page=100 happily
 *   returns the first 100 attachments of the whole 26,950-file library with a
 *   200. Every batch response is checked: any id that was not asked for aborts
 *   the run. Without that check the manifest would fill with plausible,
 *   completely unrelated files.
 *
 * Why the short-count guard is the important part:
 *   an earlier extraction on this project hit a pagination cap and reported
 *   "готово: 1200 из 1200" for a CPT that holds 1451. The number was internally
 *   consistent and wrong. So this script reconciles the ids it was ASKED for
 *   against the ids it RESOLVED, and refuses to print a success line while the
 *   two differ. The saved file carries `complete: false` in the same case, so a
 *   short run cannot be mistaken for a finished one later.
 *
 * Why everything is stashed on globalThis before any download:
 *   Chrome silently blocks a page's second and later programmatic download, and
 *   the console keeps only the last value of a multi-statement paste, so a
 *   blocked download used to mean the whole run was lost. Re-download any time
 *   with wpMediaSave().
 */

;(async () => {
  // Batched collection reads. 100 is the WordPress per_page ceiling; the run
  // steps down automatically if the instance caps it lower.
  let BATCH_SIZE = 100
  const MIN_BATCH_SIZE = 10

  // Two batches in flight. Each one is a 100-row query with postmeta attached,
  // so it costs the server more than a single-id read but far less than the 100
  // it replaces. scripts/wp-extract.js already sustained 8 concurrent ~700 KB
  // admin screens on this instance; 2 concurrent JSON reads is strictly gentler
  // than a load profile the box has taken.
  const CONCURRENCY = 2
  const DELAY_MS = 300 // gap between batches inside one worker
  const RETRIES = 2 // a transient 500 under load, same as wp-extract.js
  const BACKOFF_MS = 1200 // multiplied by attempt number

  // The singles pass that cleans up whatever the batches missed. Slower on
  // purpose: by this point something is already odd, and the diagnosis is worth
  // more than the speed.
  const SINGLE_CONCURRENCY = 2
  const SINGLE_DELAY_MS = 350

  // Runaway guards only. Both sit far above any real count, exactly like the
  // MAX_LIST_PAGES guard in wp-extract.js: they exist so a bug cannot turn into
  // an unbounded crawl of the client's server, not to bound normal work.
  const MAX_BATCHES = 400 // real number for 6,648 ids is 67
  const MAX_SINGLES = 2000 // real number should be 0

  // If the first batch resolves this badly, the session is almost certainly
  // anonymous despite the probe, and grinding through 66 more batches would only
  // produce a confidently wrong file. Anonymous resolution measured at ~1 in 14.
  const FIRST_BATCH_FLOOR = 0.5

  const REST = '/wp-json/wp/v2'
  const FIELDS = [
    'id',
    'date',
    'slug',
    'link',
    'title',
    'caption',
    'alt_text',
    'media_type',
    'mime_type',
    'source_url',
    'post',
    'media_details.filesize',
    'media_details.width',
    'media_details.height',
    'media_details.file',
  ].join(',')

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

  // --- authentication ------------------------------------------------------

  /**
   * A `wp_rest` nonce, from wherever this admin screen happens to keep one.
   * Which globals exist depends on which scripts the current screen enqueued,
   * so all four routes are tried rather than assuming the block editor is open.
   */
  async function findNonce() {
    const direct =
      globalThis.wpApiSettings?.nonce ||
      globalThis.wp?.apiFetch?.nonceMiddleware?.nonce ||
      globalThis.wp?.ajax?.settings?.nonce
    if (direct) return { nonce: direct, from: 'страница' }

    // Scraped from an admin screen that does enqueue wp-api-request. WordPress
    // prints the nonce inline in one of these two shapes.
    for (const path of ['/wp-admin/upload.php', '/wp-admin/index.php', '/wp-admin/post-new.php']) {
      let html
      try {
        const res = await fetch(path, { credentials: 'same-origin' })
        if (!res.ok) continue
        html = await res.text()
      } catch {
        continue
      }
      const m =
        html.match(/createNonceMiddleware\(\s*["']([a-f0-9]{8,16})["']\s*\)/) ||
        html.match(/wpApiSettings\s*=\s*\{[^}]*?"nonce"\s*:\s*"([a-f0-9]{8,16})"/)
      if (m) return { nonce: m[1], from: path }
    }
    return { nonce: null, from: null }
  }

  /**
   * Proves the requests are authenticated before 6,648 ids are spent on the
   * assumption. /wp/v2/users/me is 401 for anonymous and 200 for a logged-in
   * user, which makes it a cleaner signal than guessing from a media response.
   */
  async function probeAuth(nonce) {
    const res = await fetch(`${REST}/users/me?_fields=id,name,slug`, {
      credentials: 'same-origin',
      headers: nonce ? { 'X-WP-Nonce': nonce } : {},
    })
    if (!res.ok) return { ok: false, status: res.status }
    const me = await res.json()
    return { ok: true, id: me?.id, name: me?.name }
  }

  // --- requests ------------------------------------------------------------

  let nonce = null
  let context = 'edit' // raw title/caption; drops to `view` if the role forbids it

  async function getJson(url, attempt = 0) {
    try {
      const res = await fetch(url, {
        credentials: 'same-origin',
        headers: nonce ? { 'X-WP-Nonce': nonce } : {},
      })
      const body = await res.text()
      if (!res.ok) {
        const err = new Error(`${res.status} ${res.statusText}`)
        err.status = res.status
        try {
          err.code = JSON.parse(body)?.code
        } catch {
          /* not JSON, keep the status */
        }
        throw err
      }
      try {
        return JSON.parse(body)
      } catch {
        // An HTML login page or a plugin's error screen with a 200 on it.
        throw new Error(`ответ не JSON (${body.length} б) — вероятно, сессия истекла`)
      }
    } catch (err) {
      // 400/401/403/404 are answers, not failures: a malformed parameter, a
      // permission boundary or a deleted attachment. Retrying them wastes
      // requests on a server we are a guest on, and the 400 case in particular
      // would make the per_page step-down pay two backoffs per halving.
      if (attempt >= RETRIES || [400, 401, 403, 404].includes(err.status)) throw err
      await sleep(BACKOFF_MS * (attempt + 1))
      return getJson(url, attempt + 1)
    }
  }

  const mediaUrl = (ids) =>
    `${REST}/media?include=${ids.join(',')}&per_page=${ids.length}&orderby=include` +
    `&context=${context}&_fields=${FIELDS}`

  /** One attachment, flattened to the shape the Sanity loader wants. */
  function shape(item) {
    const pick = (v) => (v && typeof v === 'object' ? (v.raw ?? v.rendered ?? null) : (v ?? null))
    const details = item.media_details ?? {}
    const url = item.source_url ?? null
    return {
      id: String(item.id),
      url,
      filename: url ? decodeURIComponent(url.split('/').pop().split('?')[0]) : null,
      path: details.file ?? null,
      mimeType: item.mime_type ?? null,
      mediaType: item.media_type ?? null,
      // WordPress records this in postmeta; it can be absent on files uploaded
      // before WP 6.0 or imported outside the uploader. Reported, never guessed.
      filesize: typeof details.filesize === 'number' ? details.filesize : null,
      width: details.width ?? null,
      height: details.height ?? null,
      // WCAG 2.1 AA is a launch acceptance condition and the Sanity image fields
      // require alt once an asset is attached, so an empty alt here is a real
      // editorial task, not a null to shrug at. Counted in the summary.
      altText: item.alt_text ?? '',
      title: pick(item.title) ?? '',
      caption: pick(item.caption) ?? '',
      uploadedAt: item.date ?? null,
      attachedTo: item.post != null ? String(item.post) : null,
      link: item.link ?? null,
    }
  }

  // --- accumulator ---------------------------------------------------------

  globalThis.WP_MEDIA ||= { resolved: {}, missing: {}, requested: [], aborted: null }
  const store = globalThis.WP_MEDIA

  // --- run -----------------------------------------------------------------

  const ids = (globalThis.WP_MEDIA_IDS ?? []).map(String)
  if (!ids.length) {
    console.error(
      'Нет списка id. Сначала вставьте .migration-source/media-ids.js, потом этот файл.\n' +
        'Файл создаётся командой:  node scripts/build-media-manifest.mjs',
    )
    console.error('Либо загрузите его с диска:  await wpMediaIdsFromFile()  и вставьте скрипт снова.')
    return
  }
  const requested = new Set(ids)
  store.requested = ids
  store.checksum = globalThis.WP_MEDIA_CHECKSUM ?? null

  console.log(`Старт. ${ids.length} вложений. Не закрывайте вкладку.\n`)

  const found = await findNonce()
  nonce = found.nonce
  if (!nonce) {
    console.error(
      'Не найден nonce для REST (wp_rest). Без него WordPress игнорирует cookie-сессию\n' +
        'и отвечает как анониму — это примерно 1 файл из 14, молча.\n' +
        'Откройте /wp-admin/upload.php и запустите скрипт оттуда.',
    )
    store.aborted = 'nonce not found'
    return
  }
  console.log(`nonce: найден (${found.from})`)

  const auth = await probeAuth(nonce)
  if (!auth.ok) {
    console.error(
      `Проверка авторизации не прошла: /wp/v2/users/me вернул ${auth.status}.\n` +
        'Запрос уходит как от анонима. Войдите в wp-admin в этой же вкладке и повторите.',
    )
    store.aborted = `unauthenticated (users/me ${auth.status})`
    return
  }
  console.log(`авторизация: ${auth.name} (id ${auth.id})\n`)

  // Confirm the instance really accepts per_page=100 before planning 67 batches
  // around it. A lower cap answers 400 rest_invalid_param, and if that went
  // unhandled every batch would fail wholesale and dump all 6,648 ids into the
  // singles pass - which then trips MAX_SINGLES and aborts a run that had
  // nothing wrong with it. One probe request is cheaper than that.
  while (true) {
    try {
      await getJson(mediaUrl(ids.slice(0, BATCH_SIZE)))
      break
    } catch (err) {
      if (err.status !== 400 || BATCH_SIZE <= MIN_BATCH_SIZE) {
        console.error(`Пробный запрос пачки не прошёл: ${err}. Останавливаюсь.`)
        store.aborted = `batch probe failed: ${err}`
        return
      }
      BATCH_SIZE = Math.max(MIN_BATCH_SIZE, Math.floor(BATCH_SIZE / 2))
      console.warn(`  per_page отклонён, снижаю размер пачки до ${BATCH_SIZE}`)
    }
  }
  console.log(`размер пачки: ${BATCH_SIZE}, всего пачек ${Math.ceil(ids.length / BATCH_SIZE)}\n`)

  const started = Date.now()
  const batches = []
  for (let i = 0; i < ids.length; i += BATCH_SIZE) batches.push(ids.slice(i, i + BATCH_SIZE))
  if (batches.length > MAX_BATCHES) {
    console.error(`Пачек ${batches.length} при пределе ${MAX_BATCHES}. Остановлено.`)
    store.aborted = 'MAX_BATCHES exceeded'
    return
  }

  let next = 0
  let done = 0
  let abort = null
  let contextDropped = false

  async function batchWorker() {
    while (next < batches.length && !abort) {
      const batch = batches[next++]
      const asked = new Set(batch)
      let items = null
      // Two attempts at most: the second exists only for the context=edit ->
      // context=view fallback, which is a property of the role, not of the batch.
      for (let attempt = 0; attempt < 2 && items === null; attempt++) {
        try {
          items = await getJson(mediaUrl(batch))
        } catch (err) {
          // A role that cannot read in edit context answers 401/403 on the whole
          // collection. Drop to view once, globally, and redo this batch.
          if ([401, 403].includes(err.status) && context === 'edit') {
            context = 'view'
            if (!contextDropped) {
              contextDropped = true
              console.warn(
                '  context=edit запрещён, переключаюсь на view: title и caption придут ' +
                  'в виде HTML, а не сырого текста',
              )
            }
            continue
          }
          for (const id of batch) store.missing[id] = { reason: 'batch', error: String(err) }
          done += batch.length
          break
        }
      }
      if (items === null) continue

      if (!Array.isArray(items)) {
        abort = `пачка вернула не массив: ${JSON.stringify(items).slice(0, 200)}`
        break
      }

      // The `include` integrity check. An id we did not ask for means the
      // parameter was ignored and the response is arbitrary library content.
      const strangers = items.map((i) => String(i.id)).filter((id) => !asked.has(id))
      if (strangers.length) {
        abort =
          `сервер вернул вложения, которых не запрашивали (${strangers.slice(0, 5).join(', ')}). ` +
          'Параметр include проигнорирован — данные брать нельзя.'
        break
      }

      for (const item of items) store.resolved[String(item.id)] = shape(item)
      for (const id of batch) if (!store.resolved[id]) store.missing[id] = { reason: 'not in batch' }

      done += batch.length
      const hit = items.length / batch.length
      if (done === batch.length && hit < FIRST_BATCH_FLOOR) {
        abort =
          `первая пачка вернула ${items.length} из ${batch.length}. ` +
          'Так выглядит анонимный доступ (примерно 1 из 14). Останавливаюсь, не доверяя результату.'
        break
      }

      console.log(
        `  ${done}/${ids.length}  найдено ${Object.keys(store.resolved).length}` +
          (hit < 1 ? `  (в этой пачке ${items.length}/${batch.length})` : ''),
      )
      await sleep(DELAY_MS)
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, batchWorker))

  if (abort) {
    store.aborted = abort
    console.error(`\nОСТАНОВЛЕНО: ${abort}`)
    console.error('Ничего не сохраняйте до выяснения. Собранное лежит в WP_MEDIA.resolved.')
    return
  }

  // --- singles pass --------------------------------------------------------

  // Reconcile before claiming anything. Everything the batches did not return
  // gets one individual read, which turns "missing" into a diagnosis: 404 means
  // the attachment is gone from the library, 401/403 means the session cannot
  // see it, anything else is a real failure.
  const stragglers = ids.filter((id) => !store.resolved[id])
  if (stragglers.length) {
    if (stragglers.length > MAX_SINGLES) {
      store.aborted = `${stragglers.length} stragglers exceeds MAX_SINGLES ${MAX_SINGLES}`
      console.error(
        `\nНе вернулось ${stragglers.length} вложений — это больше предела ${MAX_SINGLES}.\n` +
          'Похоже на системный сбой, а не на отдельные дыры. Поштучный дозапрос не запускаю.',
      )
      return
    }

    console.log(`\nдозапрос поштучно: ${stragglers.length}`)
    let si = 0
    let sdone = 0
    async function singleWorker() {
      while (si < stragglers.length) {
        const id = stragglers[si++]
        try {
          const item = await getJson(`${REST}/media/${id}?context=${context}&_fields=${FIELDS}`)
          if (item && String(item.id) === id) {
            store.resolved[id] = shape(item)
            delete store.missing[id]
          } else {
            store.missing[id] = { reason: 'id mismatch', got: item?.id ?? null }
          }
        } catch (err) {
          store.missing[id] = {
            reason:
              err.status === 404
                ? 'нет в медиатеке (404)'
                : err.status === 401 || err.status === 403
                  ? `нет доступа (${err.status})`
                  : 'ошибка',
            error: String(err),
            code: err.code ?? null,
          }
        }
        sdone++
        if (sdone % 20 === 0 || sdone === stragglers.length)
          console.log(`  ${sdone}/${stragglers.length}`)
        await sleep(SINGLE_DELAY_MS)
      }
    }
    await Promise.all(Array.from({ length: SINGLE_CONCURRENCY }, singleWorker))
  }

  // --- reconciliation ------------------------------------------------------

  const resolvedIds = Object.keys(store.resolved)
  const unresolved = ids.filter((id) => !store.resolved[id])
  const extra = resolvedIds.filter((id) => !requested.has(id))
  const noAlt = resolvedIds.filter((id) => !store.resolved[id].altText.trim())
  const noSize = resolvedIds.filter((id) => store.resolved[id].filesize == null)
  const bytes = resolvedIds.reduce((n, id) => n + (store.resolved[id].filesize ?? 0), 0)

  store.complete = unresolved.length === 0 && extra.length === 0
  store.finishedAt = new Date().toISOString()

  console.log('\n──────────────────────────────')
  console.log(`запрошено   ${ids.length}`)
  console.log(`разрешено   ${resolvedIds.length}`)
  console.log(`не найдено  ${unresolved.length}`)
  console.log(`за ${Math.round((Date.now() - started) / 1000)} с`)
  console.log('──────────────────────────────')

  if (extra.length)
    console.error(`ЛИШНЕЕ: ${extra.length} вложений, которых не запрашивали: ${extra.slice(0, 10).join(', ')}`)

  if (!store.complete) {
    // The whole point. A number that agrees with itself is not a finished run.
    const byReason = {}
    for (const id of unresolved) {
      const r = store.missing[id]?.reason ?? 'неизвестно'
      ;(byReason[r] ||= []).push(id)
    }
    console.error(`\nНЕПОЛНО. ${unresolved.length} из ${ids.length} не разрешено:`)
    for (const [reason, list] of Object.entries(byReason))
      console.error(`  ${reason}: ${list.length} — ${list.slice(0, 15).join(', ')}${list.length > 15 ? ', ...' : ''}`)
    console.error('\nЭто НЕ успешный прогон. Сохранённый файл несёт complete: false.')
    console.error('Разберитесь с причинами, затем повторите:  await wpMediaRetry()')
  } else {
    console.log(`\nГотово: все ${ids.length} вложений разрешены.`)
  }

  console.log(`\nбез alt: ${noAlt.length} — их придётся заполнить в Sanity, WCAG 2.1 AA в условиях приёмки`)
  if (noSize.length) console.log(`без размера файла в media_details: ${noSize.length}`)
  console.log(`суммарно байт (по известным размерам): ${(bytes / 1024 / 1024).toFixed(1)} МБ`)
  console.log('\nСохранить:  wpMediaSave()')

  // --- exposed helpers -----------------------------------------------------

  /** Re-run only what is still unresolved. Safe to call repeatedly. */
  globalThis.wpMediaRetry = async function wpMediaRetry() {
    const left = store.requested.filter((id) => !store.resolved[id])
    if (!left.length) return console.log('нечего дозапрашивать')
    console.log(`повтор: ${left.length}`)
    for (const id of left) {
      try {
        const item = await getJson(`${REST}/media/${id}?context=${context}&_fields=${FIELDS}`)
        if (item && String(item.id) === id) {
          store.resolved[id] = shape(item)
          delete store.missing[id]
        }
      } catch (err) {
        store.missing[id] = { reason: 'retry', error: String(err) }
      }
      await sleep(SINGLE_DELAY_MS)
    }
    store.complete = store.requested.every((id) => store.resolved[id])
    console.log(
      `осталось не разрешено: ${store.requested.filter((id) => !store.resolved[id]).length}` +
        (store.complete ? ' — полный комплект' : ' — всё ещё НЕПОЛНО'),
    )
  }
})()

/**
 * Download whatever has been collected so far.
 *
 * `complete` is written into the file itself, so a short run stays labelled as
 * one after it leaves the browser. Downstream tooling should refuse a file with
 * complete: false rather than import 92% of the media and move on.
 */
globalThis.wpMediaSave = function wpMediaSave(name = 'wp-media.json') {
  const store = globalThis.WP_MEDIA ?? {}
  const requested = store.requested ?? []
  const resolved = store.resolved ?? {}
  const unresolved = requested.filter((id) => !resolved[id])

  const payload = {
    extractedAt: store.finishedAt ?? new Date().toISOString(),
    source: location.origin,
    idsChecksum: store.checksum ?? null,
    complete: requested.length > 0 && unresolved.length === 0 && !store.aborted,
    aborted: store.aborted ?? null,
    counts: {
      requested: requested.length,
      resolved: Object.keys(resolved).length,
      unresolved: unresolved.length,
      withoutAlt: Object.values(resolved).filter((m) => !m.altText.trim()).length,
    },
    missing: store.missing ?? {},
    media: Object.fromEntries(
      requested.filter((id) => resolved[id]).map((id) => [id, resolved[id]]),
    ),
  }

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = name
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 5000)

  console.log(
    `${name}: разрешено ${payload.counts.resolved} из ${payload.counts.requested}` +
      (payload.complete ? '' : `  — complete: false, НЕ полный комплект`),
  )
  console.log('Положите файл в .migration-source/. Всё также лежит в WP_MEDIA, пересохранить: wpMediaSave()')
}

/**
 * Load media-ids.js from disk instead of pasting 50 KB of ids.
 * Secondary route: the paste is the reliable one, because a console-initiated
 * file picker depends on Chrome treating the console as a user gesture.
 */
globalThis.wpMediaIdsFromFile = function wpMediaIdsFromFile() {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.js,.json'
    input.onchange = async () => {
      const file = input.files?.[0]
      if (!file) return reject(new Error('файл не выбран'))
      const text = await file.text()
      const m = text.match(/WP_MEDIA_IDS\s*=\s*(\[[^\]]*\])/)
      const ids = m ? JSON.parse(m[1]) : JSON.parse(text).ids
      if (!Array.isArray(ids)) return reject(new Error('не нашёл массив id в файле'))
      globalThis.WP_MEDIA_IDS = ids.map(String)
      console.log(`загружено id: ${ids.length}. Теперь вставьте scripts/wp-media-extract.js`)
      resolve(ids.length)
    }
    input.click()
  })
}
