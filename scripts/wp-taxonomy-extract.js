/**
 * WordPress taxonomy -> JSON extractor for the ClearView awards/events migration.
 *
 * Paste the whole file into the browser console on clearviewpublishing.com/wp-admin,
 * under the logged-in editor session. It starts immediately, leaves everything on
 * globalThis.WP_TAX and downloads one wp-taxonomies.json at the end. Put that file
 * in .migration-source/. If Chrome refuses the paste, type `allow pasting` first.
 *
 *     1. open /wp-admin/upload.php  (any admin screen works, this one has the nonce)
 *     2. paste this file
 *     3. wpTaxSave()            -> wp-taxonomies.json, put it in .migration-source/
 *
 * Reads only: every request is a GET against the REST API or an admin list screen.
 * Nothing is written, published or activated, and no term is created or renamed.
 *
 * Why this script exists at all:
 *   scripts/wp-extract.js read taxonomy assignments out of the `tax_input` form
 *   fields, which carry TERM IDS and nothing else. So the export knows company
 *   46943 sits in term 18, and has no idea what term 18 is called. The Sanity
 *   loader is currently writing placeholders of the form `wp-term-18` into
 *   category fields, which is meaningless to an editor. This run turns those into
 *   real names; the loader is idempotent, so a second pass fixes them in place.
 *
 * Why the nonce is not optional:
 *   WordPress applies cookie authentication to a REST request ONLY when the
 *   request also carries a valid `wp_rest` nonce in X-WP-Nonce. Without it the
 *   cookies are ignored and the request is served anonymously - with a 200, not
 *   an error. That is the failure that made /wp/v2/media return about 1 file in
 *   14 on this project. findNonce() and probeAuth() below are lifted from
 *   scripts/wp-media-extract.js unchanged in behaviour, and the run aborts if it
 *   cannot prove it is authenticated.
 *
 * Why there are two routes and not one:
 *   the events/companies/people/acclaim/resources CPTs are not REST-exposed on
 *   this instance, and a taxonomy registered alongside them usually is not either
 *   (`show_in_rest` defaults to false). /wp/v2/taxonomies lists only the exposed
 *   ones, so it doubles as the test: a taxonomy that appears there is read over
 *   REST, and one that does not is scraped from /wp-admin/edit-tags.php, which
 *   prints id, name, slug, parent and post count for every term. The console says
 *   which route each taxonomy took, because "REST returned nothing" and "REST does
 *   not serve this taxonomy" are different facts and only one of them is alarming.
 *
 * Why each taxonomy carries a list of candidate names:
 *   the names in README.md and MIGRATION-CONTEXT.md are not all the registered
 *   names. Measured against .migration-source/ on 2026-09-17:
 *     - the events taxonomy posts as `tax_input[events_category]`, with an
 *       underscore. `events-category` is its public rewrite slug, which is why the
 *       listing URL is /events-category/awards/ and why the docs say that.
 *     - the programme taxonomy posts as `tax_input[event_programme]`.
 *       `awards_event_programme` is the name of the ACF *field* that writes into
 *       it (field_631b482396f48, type `taxonomy`), not the taxonomy.
 *   edit-tags.php wants the registered name and 404s on anything else, so each
 *   entry below lists every candidate and the run reports which one answered.
 *
 * Why `resource-categories` has no expected id list:
 *   there is no `tax_input[resource-categories]` anywhere in the export, so there
 *   is nothing to reconcile against. That absence is not evidence the taxonomy is
 *   missing - .migration-source/fields-resource.tsv, a dump of the resource edit
 *   screen, carries `yoast_wpseo_primary_resource-categories_term`, and Yoast only
 *   emits that for a taxonomy that is public, hierarchical and registered on the
 *   post type. The reason the checklist is absent is trap 3 in MIGRATION-CONTEXT:
 *   Resources are the one CPT on the block editor, where the taxonomy panel is
 *   rendered by React and submitted over REST, so no `tax_input` control is ever
 *   printed into the HTML. It is the same reason `title` and `slug` came back null
 *   for all 12 resources. So for this taxonomy the fetch is the ONLY source, and
 *   everything it returns is new information rather than a cross-check.
 *
 * Why the walk stops on "no new terms" and not on a page count:
 *   trap 2 in MIGRATION-CONTEXT. A 60-page cap once produced exactly 1200
 *   Companies and the report "готово: 1200 из 1200" for a CPT holding 1451. The
 *   number was internally consistent and wrong. MAX_LIST_PAGES here is a runaway
 *   guard against a bug turning into an unbounded crawl of the client's server,
 *   not a bound on normal work: the largest taxonomy in scope holds 13 terms and
 *   the guard sits three orders of magnitude above it.
 *
 * Why everything is stashed on globalThis before any download:
 *   Chrome silently blocks a page's second and later programmatic download, and
 *   the console keeps only the last value of a multi-statement paste, so a blocked
 *   download used to mean the whole run was lost. Re-download any time with
 *   wpTaxSave().
 *
 * To re-run one taxonomy afterwards:  await wpTaxExtract('company_category')
 * To confirm parents term by term:    await wpTaxParents('company_category')
 */

;(async () => {
  // One taxonomy at a time, one page at a time. The whole job is a few dozen
  // small GETs against a server we do not yet hold written permission to crawl,
  // so there is nothing to gain from concurrency here.
  const DELAY_MS = 250 // gap between list pages
  const RETRIES = 2 // a heavy admin screen under load can 500 transiently
  const BACKOFF_MS = 1200 // multiplied by attempt number
  const TERM_DELAY_MS = 300 // gap in the optional per-term parent confirmation

  // Runaway guards only. Both sit far above any plausible count - the biggest
  // taxonomy in scope holds 13 terms, and 200 pages at the 20-row default screen
  // size would be 4,000. They exist so a bug cannot become an unbounded crawl.
  const MAX_LIST_PAGES = 200
  const MAX_TERMS_PER_TAXONOMY = 20000

  const REST = '/wp-json/wp/v2'

  /**
   * The taxonomies to collect, with everything measured from .migration-source/
   * on 2026-09-17 baked in so the reconciliation happens in the browser, next to
   * the fetch, instead of in a follow-up script nobody remembers to run.
   *
   *   names        candidate registered names, tried in order (see the docblock)
   *   postType     only used to build a tidy edit-tags.php URL; the screen works
   *                without it, but with it the admin menu highlights correctly
   *                and a wrong post_type never changes which terms are listed
   *   usedBy       which export file the expectations came from
   *   records      distinct records carrying at least one term of this taxonomy
   *   usage        term id -> number of records tagged with it, in the export
   *   expectNames  term id -> name already known from the export, where one is
   *                known. Only `event_programme` has this: the ACF taxonomy field
   *                that writes into it renders as a <select>, and wp-extract.js
   *                keeps the visible label next to the stored value.
   */
  const TAXONOMIES = [
    {
      key: 'company_category',
      names: ['company_category'],
      postType: 'companies',
      usedBy: 'wp-source.json / companies',
      records: 310,
      usage: { 10: 14, 11: 139, 15: 10, 16: 40, 17: 44, 18: 102, 22: 1, 23: 3, 24: 1, 34: 2 },
      expectNames: null,
    },
    {
      key: 'people_category',
      names: ['people_category'],
      postType: 'people',
      usedBy: 'wp-source.json / people',
      records: 437,
      usage: { 12: 7, 19: 403, 25: 35, 33: 1 },
      expectNames: null,
    },
    {
      key: 'acclaim---awards-programme',
      names: ['acclaim---awards-programme'],
      postType: 'acclaim',
      usedBy: 'wp-source.json / acclaim',
      records: 7,
      usage: { 62: 1, 63: 1, 64: 1, 66: 1, 67: 1, 68: 1, 69: 1 },
      expectNames: null,
    },
    {
      // No tax_input for this one exists in the export at all. See the docblock:
      // the taxonomy is real, the block editor is why its control never rendered.
      key: 'resource-categories',
      names: ['resource-categories', 'resource_categories', 'resource-category'],
      postType: 'resource',
      usedBy: 'нигде — в выгрузке нет ни одного tax_input',
      records: null,
      usage: null,
      expectNames: null,
    },
    {
      key: 'events_category',
      names: ['events_category', 'events-category'],
      postType: 'events',
      usedBy: 'wp-events.json',
      records: 254,
      // 6 awards, 8 summits, 9 webinar, 21 briefings. Sums to 256 assignments
      // over 254 records: 20663 holds 6+21 and 45031 holds 9+8. The 255th record
      // is 2877, which carries no term at all - see MIGRATION-CONTEXT §7.4.
      usage: { 6: 119, 8: 64, 9: 72, 21: 1 },
      expectNames: null,
    },
    {
      key: 'event_programme',
      names: ['event_programme', 'awards_event_programme'],
      postType: 'events',
      usedBy: 'wp-events.json',
      records: 61,
      usage: { 39: 5, 40: 5, 41: 5, 42: 5, 43: 5, 44: 5, 45: 5, 46: 6, 47: 5, 48: 5, 49: 5, 51: 4, 61: 1 },
      // Read off the ACF <select> labels in wp-events.json, zero disagreements
      // across 255 records. These are the 13 terms MIGRATION-CONTEXT §5 calls
      // awardsProgrammeGroup, so a name that comes back different here is a real
      // finding, not noise.
      expectNames: {
        39: 'WealthBriefingAsia External Asset Management Awards',
        40: 'WealthBriefing MENA Awards for Excellence',
        41: 'WealthBriefing Channel Islands Awards',
        42: 'WealthBriefing Swiss Awards',
        43: 'WealthBriefing WealthTech Americas Awards',
        44: 'WealthBriefing Swiss External Asset Management Awards for Excellence',
        45: 'WealthBriefing European Awards',
        46: 'Family Wealth Report Awards',
        47: 'WealthBriefingAsia Awards',
        48: 'WealthBriefingAsia Greater China Awards',
        49: 'WealthBriefing Wealth For Good Awards',
        51: 'Miami Family Wealth Report Awards incorporating Latin America and the Caribbean',
        61: 'WealthBriefing Marketing Awards',
      },
    },
  ]

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
  const parse = (html) => new DOMParser().parseFromString(html, 'text/html')
  const clean = (s) => (s ?? '').replace(/ /g, ' ').trim()
  // WordPress prints a bare em dash in any column it has nothing to put in, so
  // an empty description arrives as "—" rather than as an empty string.
  const cleanCell = (s) => {
    const v = clean(s)
    return v === '—' || v === '-' ? '' : v
  }

  // --- accumulator ---------------------------------------------------------

  globalThis.WP_TAX ||= { taxonomies: {}, discovery: null, aborted: null }
  const store = globalThis.WP_TAX

  // --- authentication ------------------------------------------------------

  let nonce = null

  /**
   * A `wp_rest` nonce, from wherever this admin screen happens to keep one.
   * Which globals exist depends on which scripts the current screen enqueued, so
   * all four routes are tried rather than assuming the block editor is open.
   */
  async function findNonce() {
    const direct =
      globalThis.wpApiSettings?.nonce ||
      globalThis.wp?.apiFetch?.nonceMiddleware?.nonce ||
      globalThis.wp?.ajax?.settings?.nonce
    if (direct) return { nonce: direct, from: 'страница' }

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
   * Proves the requests are authenticated before anything is read on the
   * assumption. /wp/v2/users/me is 401 for anonymous and 200 for a logged-in
   * user, which makes it a cleaner signal than guessing from a taxonomy response
   * that would look plausible either way.
   */
  async function probeAuth(n) {
    const res = await fetch(`${REST}/users/me?_fields=id,name,slug`, {
      credentials: 'same-origin',
      headers: n ? { 'X-WP-Nonce': n } : {},
    })
    if (!res.ok) return { ok: false, status: res.status }
    const me = await res.json()
    return { ok: true, id: me?.id, name: me?.name }
  }

  // --- requests ------------------------------------------------------------

  /**
   * Retries on failure, backing off, exactly like scripts/wp-extract.js: a run
   * that goes fast and silently drops records is worse than a slow one.
   * 400/401/403/404 are answers rather than failures - a wrong taxonomy name, a
   * permission boundary, a taxonomy that is simply not REST-exposed - and
   * retrying them only spends requests on a server we are a guest on.
   */
  async function request(url, attempt = 0) {
    try {
      const res = await fetch(url, {
        credentials: 'same-origin',
        headers: nonce ? { 'X-WP-Nonce': nonce } : {},
      })
      const body = await res.text()
      if (!res.ok) {
        const err = new Error(`${res.status} ${res.statusText}`)
        err.status = res.status
        err.body = body
        throw err
      }
      return { body, headers: res.headers }
    } catch (err) {
      if (attempt >= RETRIES || [400, 401, 403, 404].includes(err.status)) throw err
      await sleep(BACKOFF_MS * (attempt + 1))
      return request(url, attempt + 1)
    }
  }

  async function getJson(url) {
    const { body, headers } = await request(url)
    try {
      return { json: JSON.parse(body), headers }
    } catch {
      // An HTML login page or a plugin's error screen with a 200 on it.
      throw new Error(`ответ не JSON (${body.length} б) — вероятно, сессия истекла`)
    }
  }

  const getHtml = (url) => request(url).then((r) => parse(r.body))

  // --- route 1: REST -------------------------------------------------------

  /**
   * Every taxonomy WordPress exposes over REST, keyed by registered name.
   * A taxonomy missing from this map has show_in_rest false and can only be
   * scraped; that is the expected case on this instance, not a problem.
   */
  async function discoverTaxonomies() {
    const normalise = (json) => {
      const out = {}
      for (const t of Object.values(json ?? {})) {
        if (!t?.slug) continue
        out[t.slug] = {
          slug: t.slug,
          name: t.name ?? null,
          restBase: t.rest_base ?? t.slug,
          restNamespace: t.rest_namespace ?? 'wp/v2',
          hierarchical: t.hierarchical ?? null,
          types: t.types ?? null,
        }
      }
      return out
    }

    try {
      return normalise((await getJson(`${REST}/taxonomies?context=edit`)).json)
    } catch (err) {
      // context=edit needs edit_posts on the attached post type; if the role is
      // narrower, the default view context still lists the public taxonomies,
      // which is all that is needed to decide the route.
      if (![401, 403].includes(err.status)) return null
      try {
        return normalise((await getJson(`${REST}/taxonomies`)).json)
      } catch {
        return null
      }
    }
  }

  /** Walk /wp/v2/<rest_base>, page by page, stopping when a page adds nothing. */
  async function termsFromRest(info) {
    const base = `/wp-json/${info.restNamespace}/${info.restBase}`
    const terms = new Map()
    for (let page = 1; page <= MAX_LIST_PAGES; page++) {
      const url =
        `${base}?per_page=100&page=${page}&orderby=id&order=asc` +
        `&hide_empty=false&_fields=id,name,slug,parent,count,description`
      let json
      try {
        ;({ json } = await getJson(url))
      } catch (err) {
        // WordPress answers rest_post_invalid_page_number once you walk past the
        // end, which is a clean stop signal rather than a failure.
        if (err.status === 400) break
        throw err
      }
      if (!Array.isArray(json)) throw new Error('REST вернул не массив')
      let fresh = 0
      for (const t of json) {
        const id = String(t.id)
        if (terms.has(id)) continue
        terms.set(id, {
          id,
          name: clean(t.name),
          slug: t.slug ?? null,
          parent: t.parent ? String(t.parent) : null,
          count: typeof t.count === 'number' ? t.count : null,
          description: clean(t.description) || null,
          parentSource: 'rest',
        })
        fresh++
      }
      if (!fresh) break
      if (terms.size > MAX_TERMS_PER_TAXONOMY)
        throw new Error(`больше ${MAX_TERMS_PER_TAXONOMY} термов — похоже на зацикливание`)
      await sleep(DELAY_MS)
    }
    return [...terms.values()]
  }

  // --- route 2: edit-tags.php ----------------------------------------------

  /**
   * One row of the terms list table.
   *
   * The clean name, slug and parent all come from the hidden `#inline_<id>` div
   * WordPress prints for Quick Edit. That is deliberately preferred over the
   * visible cells: on a hierarchical taxonomy the visible title is prefixed with
   * one "— " per level, so reading it would give a child term a name that starts
   * with an em dash. The visible cells are the fallback, with the leading dashes
   * stripped and the nesting level recorded instead.
   */
  function readRow(row) {
    const id = row.id?.startsWith('tag-')
      ? row.id.slice(4)
      : (row.querySelector('input[name="delete_tags[]"]')?.value ?? null)
    if (!id) return null

    // Matched by prefix inside the row rather than by `#inline_<id>`: the ids are
    // numeric, so a bare id selector needs CSS.escape and reads like a puzzle.
    const inline = row.querySelector('div[id^="inline_"]')
    const level = Number((row.className.match(/\blevel-(\d+)\b/) ?? [])[1] ?? 0)

    const visibleName = clean(row.querySelector('.row-title')?.textContent).replace(
      /^(?:—\s*)+/,
      '',
    )
    const name = clean(inline?.querySelector('.name')?.textContent) || visibleName || null
    const slug =
      clean(inline?.querySelector('.slug')?.textContent) ||
      clean(row.querySelector('.column-slug')?.textContent) ||
      null

    const rawParent = clean(inline?.querySelector('.parent')?.textContent)
    const parent = rawParent && rawParent !== '0' ? rawParent : null

    const countText = clean(row.querySelector('.column-posts')?.textContent)
    const count = /^\d+$/.test(countText) ? Number(countText) : null

    return {
      id: String(id),
      name,
      slug,
      parent,
      count,
      description: cleanCell(row.querySelector('.column-description')?.textContent) || null,
      level,
      parentSource: inline?.querySelector('.parent') ? 'inline' : 'none',
    }
  }

  /**
   * Walk the terms list table for one taxonomy name.
   *
   * Returns `null` for "this screen does not exist", which is how a wrong
   * candidate name is told apart from a real taxonomy that happens to be empty.
   * WordPress wp_die()s with "Invalid taxonomy" on an unknown name - usually with
   * a 404, but a security plugin can turn that into a 200, so the presence of the
   * #the-list table is the test rather than the status code.
   */
  async function termsFromAdmin(name, postType) {
    const terms = new Map()
    let sawTable = false

    for (let page = 1; page <= MAX_LIST_PAGES; page++) {
      const url =
        `/wp-admin/edit-tags.php?taxonomy=${encodeURIComponent(name)}` +
        (postType ? `&post_type=${encodeURIComponent(postType)}` : '') +
        `&orderby=name&order=asc&paged=${page}`
      let doc
      try {
        doc = await getHtml(url)
      } catch (err) {
        if (err.status === 404) return null // unknown taxonomy name
        if (page === 1) throw err
        console.warn(`    стр. ${page}: ${err}`)
        break
      }

      if (!doc.querySelector('#the-list')) {
        if (page > 1) break
        // Distinguish "no such taxonomy" from "no permission", because one is a
        // typo in our candidate list and the other blocks the whole run.
        const text = doc.body?.textContent ?? ''
        if (/not allowed|недостаточно прав|permission/i.test(text))
          throw new Error(`нет прав на просмотр термов таксономии ${name}`)
        return null
      }
      sawTable = true

      const rows = [...doc.querySelectorAll('#the-list tr')]
      let fresh = 0
      for (const row of rows) {
        const term = readRow(row)
        if (!term || terms.has(term.id)) continue
        terms.set(term.id, term)
        fresh++
      }
      // An empty taxonomy prints a single "no items" row, which yields no terms
      // on page 1 - a valid, complete answer of zero. Past page 1, no new terms
      // means the end of the list, including the case where WordPress silently
      // redirected an over-long `paged` back to page one.
      if (!fresh) break
      if (terms.size > MAX_TERMS_PER_TAXONOMY)
        throw new Error(`больше ${MAX_TERMS_PER_TAXONOMY} термов — похоже на зацикливание`)
      await sleep(DELAY_MS)
    }

    if (!sawTable) return null

    // Terms whose Quick Edit block was absent still have their nesting level from
    // the row class, so a parent can be inferred from the term above them at one
    // level up. Inference is recorded as such - wpTaxParents() confirms it.
    const stack = []
    for (const term of terms.values()) {
      if (term.parentSource === 'inline') {
        stack[term.level] = term.id
        stack.length = term.level + 1
        continue
      }
      if (term.level > 0 && stack[term.level - 1]) {
        term.parent = stack[term.level - 1]
        term.parentSource = 'level'
      }
      stack[term.level] = term.id
      stack.length = term.level + 1
    }

    return [...terms.values()]
  }

  // --- reconciliation ------------------------------------------------------

  /**
   * The point of the whole script. A term id used by a record but absent from the
   * fetch means the loader has no name to write and would fall back to a
   * `wp-term-N` placeholder forever, so it is reported as an error rather than a
   * footnote. The reverse - a term nobody uses - is normal and only printed.
   *
   * The `count` WordPress reports is a cross-check, not an assertion: it counts
   * published posts of every post type attached to the taxonomy, while the export
   * counts every status including draft, pending and private. They are expected
   * to differ slightly; a large gap means the fetch and the export are not looking
   * at the same taxonomy.
   */
  function reconcile(spec, terms) {
    const found = new Set(terms.map((t) => t.id))
    const expected = spec.usage ? Object.keys(spec.usage) : null

    const report = {
      expectedIds: expected,
      foundIds: [...found].sort((a, b) => Number(a) - Number(b)),
      missing: expected ? expected.filter((id) => !found.has(id)) : [],
      unused: expected ? [...found].filter((id) => !expected.includes(id)) : [],
      countMismatch: [],
      nameMismatch: [],
      ok: true,
    }

    if (expected) {
      for (const t of terms) {
        const used = spec.usage[t.id]
        if (used == null || t.count == null) continue
        if (t.count !== used) report.countMismatch.push({ id: t.id, wordpress: t.count, export: used })
      }
    }
    if (spec.expectNames) {
      for (const t of terms) {
        const want = spec.expectNames[t.id]
        if (want && want !== t.name) report.nameMismatch.push({ id: t.id, expected: want, got: t.name })
      }
    }
    report.ok = report.missing.length === 0 && report.nameMismatch.length === 0
    return report
  }

  function printReport(spec, terms, report) {
    const cell = (v, n) => String(v ?? '—').padEnd(n)
    for (const t of terms) {
      const used = spec.usage?.[t.id]
      console.log(
        `    ${String(t.id).padStart(4)}  ${cell(t.name, 52)}  ${cell(t.slug, 30)}  ` +
          `записей ${String(t.count ?? '—').padStart(5)}` +
          (used != null ? `  в выгрузке ${used}` : '') +
          (t.parent ? `  родитель ${t.parent}` : ''),
      )
    }
    if (!report.expectedIds) {
      console.log(
        `    сверять не с чем: в выгрузке нет ни одного tax_input этой таксономии — ` +
          `всё, что выше, новые данные`,
      )
      return
    }
    if (report.missing.length) {
      console.error(
        `    НЕ НАЙДЕНО ${report.missing.length} термов, которые используют записи: ` +
          report.missing.join(', '),
      )
      console.error('    загрузчику нечего писать вместо wp-term-N по этим id. Разберитесь.')
    } else {
      console.log(`    сверка id: все ${report.expectedIds.length} используемых термов найдены`)
    }
    if (report.unused.length)
      console.log(`    не используется ни одной записью: ${report.unused.join(', ')} — это нормально`)
    for (const m of report.nameMismatch)
      console.error(`    ИМЯ НЕ СОВПАЛО: ${m.id} ожидалось "${m.expected}", пришло "${m.got}"`)
    if (report.countMismatch.length) {
      console.log(
        `    расхождение счётчиков (WordPress считает только published, выгрузка — все статусы): ` +
          report.countMismatch.map((c) => `${c.id}: wp ${c.wordpress} / выгрузка ${c.export}`).join(', '),
      )
    }
  }

  // --- one taxonomy --------------------------------------------------------

  async function wpTaxExtract(key) {
    const spec = TAXONOMIES.find((t) => t.key === key)
    if (!spec) {
      console.error(`неизвестная таксономия "${key}". Известны: ${TAXONOMIES.map((t) => t.key).join(', ')}`)
      return null
    }

    console.log(`\n=== ${spec.key} ===`)
    const discovery = store.discovery ?? {}
    let terms = null
    let route = null
    let resolvedName = null
    const tried = []

    // REST first, but only for a name the discovery endpoint actually listed.
    // Guessing a rest_base and getting a 404 tells us nothing we do not already
    // know, and spends a request doing it.
    for (const name of spec.names) {
      const info = discovery[name]
      if (!info) continue
      try {
        terms = await termsFromRest(info)
        route = 'REST'
        resolvedName = name
        break
      } catch (err) {
        tried.push(`REST ${name}: ${err}`)
      }
    }

    if (!terms) {
      for (const name of spec.names) {
        try {
          const got = await termsFromAdmin(name, spec.postType)
          if (got === null) {
            tried.push(`edit-tags ${name}: экрана нет`)
            continue
          }
          terms = got
          route = 'edit-tags.php'
          resolvedName = name
          break
        } catch (err) {
          tried.push(`edit-tags ${name}: ${err}`)
        }
      }
    }

    if (!terms) {
      console.error(`  не удалось прочитать. Пробовали:`)
      for (const t of tried) console.error(`    ${t}`)
      console.error(
        `  откройте /wp-admin/edit-tags.php?taxonomy=${spec.names[0]} вручную и посмотрите\n` +
          `  настоящее имя таксономии в адресной строке — кандидаты в скрипте могли устареть`,
      )
      store.taxonomies[spec.key] = {
        taxonomy: spec.key,
        resolvedName: null,
        route: null,
        tried,
        terms: [],
        reconciliation: null,
        complete: false,
      }
      return null
    }

    terms.sort((a, b) => Number(a.id) - Number(b.id))
    const report = reconcile(spec, terms)

    console.log(
      `  маршрут: ${route}, имя таксономии "${resolvedName}"` +
        (resolvedName !== spec.key ? `  (в документах — "${spec.key}")` : '') +
        `, термов ${terms.length}`,
    )
    if (tried.length) for (const t of tried) console.log(`    до этого: ${t}`)
    printReport(spec, terms, report)

    store.taxonomies[spec.key] = {
      taxonomy: spec.key,
      resolvedName,
      route,
      tried,
      usedBy: spec.usedBy,
      recordsTaggedInExport: spec.records,
      terms,
      reconciliation: report,
      complete: report.ok,
    }
    return store.taxonomies[spec.key]
  }

  /**
   * Optional: confirm every parent against the term edit screen, which prints the
   * real parent in a <select>, rather than trusting the Quick Edit block or the
   * row indentation. One extra GET per term - cheap at these counts, and the only
   * way to be sure when a taxonomy paginates a child away from its parent.
   */
  async function wpTaxParents(key) {
    const entry = store.taxonomies[key]
    if (!entry?.terms?.length) return console.error(`нет собранных термов для "${key}"`)
    const name = entry.resolvedName
    let changed = 0
    for (const term of entry.terms) {
      try {
        const doc = await getHtml(
          `/wp-admin/term.php?taxonomy=${encodeURIComponent(name)}&tag_ID=${encodeURIComponent(term.id)}`,
        )
        const sel = doc.querySelector('select#parent')
        if (!sel) continue
        const picked = sel.querySelector('option[selected]') ?? sel.selectedOptions[0]
        const value = picked?.value ?? '-1'
        const parent = value && value !== '-1' && value !== '0' ? String(value) : null
        if (parent !== term.parent) {
          console.warn(`  ${term.id} "${term.name}": родитель ${term.parent ?? '—'} → ${parent ?? '—'}`)
          changed++
        }
        term.parent = parent
        term.parentSource = 'term.php'
      } catch (err) {
        console.warn(`  ${term.id}: ${err}`)
      }
      await sleep(TERM_DELAY_MS)
    }
    console.log(`${key}: родители подтверждены, исправлено ${changed}`)
  }

  // --- save ----------------------------------------------------------------

  /**
   * Download whatever has been collected so far, in one file.
   *
   * `complete` is written into the file itself, so a run that failed to resolve a
   * taxonomy stays labelled as one after it leaves the browser. The loader should
   * refuse a file with complete: false rather than half-name the categories and
   * leave the rest as wp-term-N placeholders nobody notices again.
   */
  function wpTaxSave(name = 'wp-taxonomies.json') {
    const taxonomies = store.taxonomies ?? {}
    const entries = Object.values(taxonomies)
    const payload = {
      extractedAt: new Date().toISOString(),
      source: location.origin,
      complete: entries.length === TAXONOMIES.length && entries.every((e) => e.complete),
      aborted: store.aborted ?? null,
      counts: Object.fromEntries(entries.map((e) => [e.taxonomy, e.terms.length])),
      restExposed: store.discovery ? Object.keys(store.discovery).sort() : null,
      taxonomies,
    }

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = name
    a.click()
    setTimeout(() => URL.revokeObjectURL(a.href), 5000)

    console.log(
      `${name}: ` +
        entries.map((e) => `${e.taxonomy} ${e.terms.length}`).join(', ') +
        (payload.complete ? '' : '  — complete: false, НЕ полный комплект'),
    )
    console.log('Положите файл в .migration-source/. Всё также лежит в WP_TAX, пересохранить: wpTaxSave()')
  }

  globalThis.wpTaxExtract = wpTaxExtract
  globalThis.wpTaxParents = wpTaxParents
  globalThis.wpTaxSave = wpTaxSave

  // --- run -----------------------------------------------------------------

  console.log('Старт. Не закрывайте вкладку.\n')
  const started = Date.now()

  const found = await findNonce()
  nonce = found.nonce
  if (!nonce) {
    console.error(
      'Не найден nonce для REST (wp_rest). Без него WordPress игнорирует cookie-сессию\n' +
        'и отвечает как анониму — с кодом 200, молча.\n' +
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
  console.log(`авторизация: ${auth.name} (id ${auth.id})`)

  store.discovery = await discoverTaxonomies()
  if (store.discovery) {
    const names = Object.keys(store.discovery).sort()
    console.log(`\nтаксономии, выставленные в REST (${names.length}): ${names.join(', ')}`)
    const wanted = TAXONOMIES.flatMap((t) => t.names)
    const unknown = names.filter((n) => !wanted.includes(n))
    if (unknown.length) console.log(`из них не в нашем списке: ${unknown.join(', ')}`)
  } else {
    console.log('\n/wp/v2/taxonomies недоступен — идём сразу через edit-tags.php')
    store.discovery = {}
  }

  for (const spec of TAXONOMIES) await wpTaxExtract(spec.key)

  // --- summary -------------------------------------------------------------

  const entries = Object.values(store.taxonomies)
  const broken = entries.filter((e) => !e.complete)

  console.log('\n──────────────────────────────')
  for (const e of entries) {
    console.log(
      `${e.taxonomy.padEnd(30)} ${String(e.terms.length).padStart(3)} термов` +
        `  ${e.route ?? 'НЕ ПРОЧИТАНО'}` +
        (e.resolvedName && e.resolvedName !== e.taxonomy ? `  → "${e.resolvedName}"` : ''),
    )
  }
  console.log(`за ${Math.round((Date.now() - started) / 1000)} с`)
  console.log('──────────────────────────────')

  if (broken.length) {
    console.error(`\nНЕПОЛНО. Проблемы в ${broken.length} таксономиях:`)
    for (const e of broken) {
      if (!e.route) console.error(`  ${e.taxonomy}: не удалось прочитать вообще`)
      else if (e.reconciliation?.missing.length)
        console.error(`  ${e.taxonomy}: не найдены используемые термы ${e.reconciliation.missing.join(', ')}`)
      else if (e.reconciliation?.nameMismatch.length)
        console.error(`  ${e.taxonomy}: имена не совпали с ожидаемыми`)
    }
    console.error('\nЭто НЕ успешный прогон. Сохранённый файл несёт complete: false.')
  } else {
    console.log('\nГотово: все таксономии прочитаны, все используемые термы найдены.')
  }

  console.log('\nСохранить:  wpTaxSave()')
  console.log('Подтвердить родителей по одной таксономии:  await wpTaxParents("company_category")')
  wpTaxSave()
})()
