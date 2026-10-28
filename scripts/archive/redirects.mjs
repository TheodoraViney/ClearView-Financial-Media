#!/usr/bin/env node
/**
 * Legacy article URL -> archive redirect map.
 *
 * Inputs (no network):
 *   baseline.csv (repo root)                      legacy URLs, family `article` only
 *   ~/wb-archive-data/export/articles-*.json      raw titles, article_date, is_published
 *   ~/wb-archive-data/records-v8/{id}.json        our slug for the target URL
 *
 * Rules:
 *   - `?id=N` with N published -> N (method `id`).
 *   - else slug lookup on the URL's own domain, case-insensitive, against
 *     legacySlugs(rawTitle) with the domain's own variant first. One id ->
 *     `slug`; several -> most recent edition (latest article_date, ties ->
 *     higher id), `slug-latest`. Legacy served the oldest; that parity
 *     difference is counted.
 *   - target is always https://{same apex}/archive/{id}/{record.slug}.
 *
 * Output: ~/wb-archive-data/redirects/{redirects.csv, unmatched.csv, report.json, report.md}
 *
 *   node scripts/archive/redirects.mjs [--baseline baseline.csv] [--export DIR] [--records DIR] [--out DIR]
 */

import { mkdirSync, readFileSync, writeFileSync, openSync, readSync, closeSync, existsSync, readdirSync } from 'node:fs'
import { homedir } from 'node:os'
import { join, resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { legacySlugs, readExport, mergeRows } from './normalize.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))
const REPO = resolve(HERE, '../..')
const DATA = join(homedir(), 'wb-archive-data')
const SNAPSHOT = '2026-09-14'

const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, a, i, all) => (a.startsWith('--') ? [...acc, [a.slice(2), all[i + 1]]] : acc), []),
)
const BASELINE = resolve(args.baseline ?? join(REPO, 'baseline.csv'))
const EXPORT_DIR = resolve(args.export ?? join(DATA, 'export'))
const RECORDS = resolve(args.records ?? join(DATA, 'records-v8'))
const OUT = resolve(args.out ?? join(DATA, 'redirects'))

const DOMAINS = ['wealthbriefing.com', 'wealthbriefingasia.com', 'familywealthreport.com']
const ARTICLE_PATH = {
  'wealthbriefing.com': /^\/html\/article\.php(?:\/(.*))?$/i,
  'wealthbriefingasia.com': /^\/article\.php(?:\/(.*))?$/i,
  'familywealthreport.com': /^\/article\.php(?:\/(.*))?$/i,
}

/* ------------------------------------------------------------------ helpers */

/** Decode once; invalid sequences are left as they are. */
function safeDecode(s) {
  try {
    return decodeURIComponent(s)
  } catch {
    return s.replace(/(?:%[0-9a-f]{2})+/gi, (run) => {
      try {
        return decodeURIComponent(run)
      } catch {
        // decode byte-by-byte groups that form valid UTF-8, keep the rest
        return run.replace(/%[0-9a-f]{2}/gi, (b) => {
          const n = parseInt(b.slice(1), 16)
          return n < 0x80 ? String.fromCharCode(n) : b
        })
      }
    })
  }
}

function parseCsvLine(line) {
  const out = []
  let cur = ''
  let quoted = false
  for (let i = 0; i < line.length; i++) {
    const c = line[i]
    if (quoted) {
      if (c === '"' && line[i + 1] === '"') (cur += '"'), i++
      else if (c === '"') quoted = false
      else cur += c
    } else if (c === '"') quoted = true
    else if (c === ',') out.push(cur), (cur = '')
    else cur += c
  }
  out.push(cur)
  return out
}

function csvCell(v) {
  const s = v == null ? '' : String(v)
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}
const csvRow = (cells) => cells.map(csvCell).join(',')

/** Split a URL string without normalising it (keeps spaces and odd encodings). */
function splitUrl(raw) {
  const m = /^(https?):\/\/([^/?#]+)([^?#]*)(?:\?([^#]*))?(?:#.*)?$/i.exec(raw.trim())
  if (!m) return null
  return { host: m[2].toLowerCase().replace(/^www\./, '').replace(/:\d+$/, ''), path: m[3] || '/', query: m[4] ?? null }
}

const dateOf = (v) => {
  const s = String(v ?? '')
  return /^\d{4}-\d{2}-\d{2}/.test(s) && !s.startsWith('0000') ? s.slice(0, 10) : ''
}

/** Newest first: later date, then higher id. */
const newer = (a, b) => (a.date !== b.date ? (a.date > b.date ? a : b) : a.id > b.id ? a : b)
const older = (a, b) => (a.date !== b.date ? (a.date < b.date ? a : b) : a.id < b.id ? a : b)

/* ------------------------------------------------------------------- inputs */

const started = Date.now()
const exportFiles = readdirSync(EXPORT_DIR)
  .filter((f) => /^articles-\d+\.json$/.test(f))
  .sort((a, b) => parseInt(a.match(/\d+/)[0]) - parseInt(b.match(/\d+/)[0]))
const rows = mergeRows(exportFiles.map((f) => readExport(join(EXPORT_DIR, f))))

const articles = new Map() // id -> {id, title, date, published}
for (const r of rows) {
  const id = Number(r.article_id)
  articles.set(id, {
    id,
    title: r.title ?? '',
    date: dateOf(r.article_date),
    datePublished: dateOf(r.date_published),
    published: String(r.is_published) === '1',
  })
}
rows.length = 0
const published = [...articles.values()].filter((a) => a.published)

/** Read just the slug from a record without parsing the whole body. */
const recordSlugCache = new Map()
const headBuf = Buffer.alloc(1024)
function recordSlug(id) {
  if (recordSlugCache.has(id)) return recordSlugCache.get(id)
  let slug = null
  const path = join(RECORDS, `${id}.json`)
  if (existsSync(path)) {
    const fd = openSync(path, 'r')
    const n = readSync(fd, headBuf, 0, headBuf.length, 0)
    closeSync(fd)
    const m = /"slug"\s*:\s*"((?:[^"\\]|\\.)*)"/.exec(headBuf.toString('utf8', 0, n))
    slug = m ? JSON.parse(`"${m[1]}"`) : JSON.parse(readFileSync(path, 'utf8')).slug ?? null
  }
  recordSlugCache.set(id, slug)
  return slug
}

/* -------------------------------------------------------------------- index */

/**
 * Per domain, key -> Set(id) per tier. Tier order is the lookup order:
 *   case      WBA/FWR only: the case-preserved slug, compared exactly
 *   own       the domain's own legacySlugs() variant of the raw title
 *   cross     the other domain family's variant
 *   nbsp      own/cross variant with NBSP -> space
 *   trim      own/cross variant of the trimmed title (and trimmed + NBSP)
 */
const TIERS = ['case', 'own', 'cross', 'nbsp', 'trim']
function variantsFor(rawTitle, domain) {
  const [wb, other = wb] = legacySlugs(rawTitle)
  const own = domain === 'wealthbriefing.com' ? wb : other
  const cross = domain === 'wealthbriefing.com' ? other : wb
  const nb = rawTitle.replace(/ /g, ' ')
  const tr = rawTitle.trim()
  const trnb = nb.trim()
  // WBA/FWR keep the title's case, so two titles differing only in case are two
  // addresses there (53 pairs); match case-sensitively first. WB lowercases.
  const exact = domain === 'wealthbriefing.com' ? [] : [rawTitle.replace(/-/g, '_dash_').replace(/ /g, '-')]
  return {
    case: exact,
    own: [own],
    cross: [cross],
    nbsp: legacySlugs(nb),
    trim: [...legacySlugs(tr), ...legacySlugs(trnb)],
  }
}

function buildIndex(predicate) {
  const index = {}
  for (const d of DOMAINS) {
    const byTier = Object.fromEntries(TIERS.map((t) => [t, new Map()]))
    for (const a of articles.values()) {
      if (!predicate(a)) continue
      const v = variantsFor(a.title, d)
      for (const t of TIERS) {
        for (const key of new Set(v[t])) {
          if (!key) continue
          let set = byTier[t].get(key)
          if (!set) byTier[t].set(key, (set = new Set()))
          set.add(a.id)
        }
      }
    }
    index[d] = byTier
  }
  return index
}
const pubIndex = buildIndex((a) => a.published)
const unpubIndex = buildIndex((a) => !a.published)

/** Lookup -> {tier, ids[]} or null. Lowercased key, raw then trimmed fallback. */
function lookup(index, domain, slug) {
  for (const t of TIERS) {
    const hit = index[domain][t].get(t === 'case' ? slug : slug.toLowerCase())
    if (hit) return { tier: t, ids: [...hit].sort((a, b) => a - b) }
  }
  return null
}

/** Closest published article on a domain by word overlap; a hint only, never a mapping. */
const tokenCache = {}
const tokens = (key) => new Set(key.toLowerCase().replace(/_dash_/g, '-').split(/[^a-z0-9]+/).filter(Boolean))
function nearest(domain, slug) {
  const entries = (tokenCache[domain] ??= [...pubIndex[domain].own].map(([key, ids]) => [tokens(key), ids]))
  const q = tokens(slug)
  let best = null
  for (const [t, ids] of entries) {
    let inter = 0
    for (const w of q) if (t.has(w)) inter++
    const score = inter / (q.size + t.size - inter || 1)
    if (!best || score > best.score) best = { score, ids }
  }
  if (!best || best.score < 0.5) return ''
  const a = [...best.ids].map((id) => articles.get(id)).reduce(newer)
  return `nearest ${a.id} (${best.score.toFixed(2)}): ${a.title.trim()}`
}

/* -------------------------------------------------------------------- core */

/**
 * Resolve one legacy article URL on its own domain.
 * Returns {method, id, tier?, candidates?, oldest?, reason?, hint?}.
 */
function resolveLegacy(host, path, query) {
  const re = ARTICLE_PATH[host]
  if (!re) return { reason: 'not-editorial-host' }
  const m = re.exec(path)
  if (!m) return { reason: 'malformed-path' }
  const slugRaw = m[1] ?? ''
  const slug = safeDecode(slugRaw)
  const params = new URLSearchParams(query ?? '')
  const idParam = params.get('id')
  let idNote = null
  if (idParam != null) {
    if (/^\d+$/.test(idParam)) {
      const id = Number(idParam)
      const a = articles.get(id)
      if (a?.published) {
        const own = slug ? lookup(pubIndex, host, slug) : null
        const agrees = !slug || (own && own.ids.includes(id))
        return { method: 'id', id, slugDisagrees: !agrees, slug }
      }
      idNote = a ? 'id-unpublished' : 'id-not-in-export'
    } else idNote = 'id-malformed'
  }
  if (!slug) {
    const empty = published.filter((a) => !a.title.trim())
    const latest = empty.length ? empty.reduce(newer) : null
    return {
      reason: idNote ?? 'empty-slug',
      hint: `${empty.length} published articles with an empty title (${empty.map((a) => a.id).join(' ')}); latest ${latest?.id ?? '-'}`,
    }
  }
  const hit = lookup(pubIndex, host, slug)
  if (!hit) {
    const un = lookup(unpubIndex, host, slug)
    if (idNote) return { reason: idNote, hint: un ? `slug matches unpublished ${un.ids.join(' ')}` : 'slug not found either' }
    if (un) return { reason: 'slug-matches-unpublished-only', hint: un.ids.join(' ') }
    for (const d of DOMAINS) {
      if (d === host) continue
      const other = lookup(pubIndex, d, slug)
      if (other) return { reason: 'slug-not-found', hint: `matches on ${d} (${other.tier}): ${other.ids.join(' ')}` }
    }
    return { reason: 'slug-not-found', hint: nearest(host, slug) }
  }
  const cands = hit.ids.map((id) => articles.get(id))
  if (cands.length === 1) return { method: 'slug', id: cands[0].id, tier: hit.tier, idNote }
  const latest = cands.reduce(newer)
  const oldest = cands.reduce(older)
  return { method: 'slug-latest', id: latest.id, tier: hit.tier, candidates: hit.ids, oldest: oldest.id, idNote }
}

/* --------------------------------------------------------------------- run */

const lines = readFileSync(BASELINE, 'utf8').split(/\r?\n/).filter(Boolean)
const header = parseCsvLine(lines[0])
const col = Object.fromEntries(header.map((h, i) => [h, i]))

const report = {
  generatedFrom: { baseline: BASELINE, exportFiles, records: RECORDS, snapshot: SNAPSHOT },
  baselineRows: lines.length - 1,
  skippedFamilies: {},
  articleRows: {},
  methods: {},
  tiers: {},
  idSlugDisagrees: { count: 0, samples: [] },
  idFallbackToSlug: {},
  collisions: {},
  unmatched: {},
  duplicates: {},
  coverage: {},
  missingRecordSlug: [],
  unresolvedLinks: null,
}
const bump = (obj, k, n = 1) => (obj[k] = (obj[k] ?? 0) + n)
const perDomain = (obj, d) => (obj[d] ??= {})

const redirects = []
const unmatched = []
const seenKey = new Map() // domain|decodedPath|id -> first url
const seenKeyCI = new Map()
const covered = Object.fromEntries(DOMAINS.map((d) => [d, new Set()]))
const hidden = Object.fromEntries(DOMAINS.map((d) => [d, new Set()]))
const collisionAddr = Object.fromEntries(DOMAINS.map((d) => [d, { addresses: 0, articles: 0, parityDiff: 0, maxReuse: 0, worst: '' }]))
const unmatchedSamples = {}

for (let i = 1; i < lines.length; i++) {
  const cells = parseCsvLine(lines[i])
  const url = cells[col.url]
  const family = cells[col.family]
  const domain = cells[col.domain]
  const entries = Number(cells[col.entries] || 1)
  if (family !== 'article') {
    bump(report.skippedFamilies, `${domain} ${family}`)
    continue
  }
  bump(report.articleRows, domain)
  const parts = splitUrl(url)
  const host = parts?.host ?? domain

  // duplicates by source key
  if (parts) {
    const idq = new URLSearchParams(parts.query ?? '').get('id') ?? ''
    const key = `${host}|${safeDecode(parts.path)}|${idq}`
    if (seenKey.has(key)) {
      const dd = perDomain(report.duplicates, host)
      bump(dd, 'exact')
      ;(dd.samples ??= []).length < 5 && dd.samples.push([seenKey.get(key), url])
    } else seenKey.set(key, url)
    const keyCI = key.toLowerCase()
    if (seenKeyCI.has(keyCI) && !seenKey.has(key)) bump(perDomain(report.duplicates, host), 'caseOnly')
    else if (seenKeyCI.has(keyCI) && seenKey.get(key) !== url) {
      /* counted above */
    } else if (seenKeyCI.has(keyCI)) {
      /* identical URL string repeated */
    }
    if (!seenKeyCI.has(keyCI)) seenKeyCI.set(keyCI, url)
  }

  const res = parts ? resolveLegacy(host, parts.path, parts.query) : { reason: 'malformed-url' }
  if (res.method) {
    const slug = recordSlug(res.id)
    if (slug == null) {
      report.missingRecordSlug.push(res.id)
      unmatched.push({ url, domain: host, reason: 'no-record-file', hint: String(res.id) })
      redirects.push({ url, domain: host, method: 'home', id: '', target: `https://${host}/` })
      bump(perDomain(report.methods, host), 'home')
      continue
    }
    const target = `https://${host}/archive/${res.id}/${slug}`
    redirects.push({ url, domain: host, method: res.method, id: res.id, target })
    bump(perDomain(report.methods, host), res.method)
    covered[host].add(res.id)
    if (res.tier) bump(perDomain(report.tiers, host), res.tier)
    if (res.idNote) bump(perDomain(report.idFallbackToSlug, host), res.idNote)
    if (res.slugDisagrees) {
      report.idSlugDisagrees.count++
      if (report.idSlugDisagrees.samples.length < 8) report.idSlugDisagrees.samples.push({ url, id: res.id, title: articles.get(res.id).title })
    }
    if (res.method === 'slug-latest') {
      const c = collisionAddr[host]
      c.addresses++
      c.articles += res.candidates.length - 1
      if (res.oldest !== res.id) c.parityDiff++
      if (res.candidates.length > c.maxReuse) (c.maxReuse = res.candidates.length), (c.worst = url)
      for (const id of res.candidates) if (id !== res.id) hidden[host].add(id)
      const preCands = res.candidates.filter((id) => (articles.get(id).date || '0') <= SNAPSHOT)
      if (entries !== res.candidates.length) {
        const em = (c.entriesMismatch ??= { count: 0, explainedBySnapshot: 0, samples: [] })
        em.count++
        if (preCands.length === entries) em.explainedBySnapshot++
        else if (em.samples.length < 6)
          em.samples.push({ url, entries, candidates: res.candidates.map((id) => `${id}@${articles.get(id).date}`) })
      }
      if (articles.get(res.id).date > SNAPSHOT) c.latestIsPostSnapshot = (c.latestIsPostSnapshot ?? 0) + 1
    }
  } else {
    // No published article behind the address (an empty slug, or an article unpublished since the snapshot):
    // the publication's home page, so every baseline URL still ends on a live page.
    redirects.push({ url, domain: host, method: 'home', id: '', target: `https://${host}/` })
    bump(perDomain(report.methods, host), 'home')
    unmatched.push({ url, domain: host, reason: res.reason, hint: res.hint ?? '' })
    bump(perDomain(report.unmatched, host), res.reason)
    const s = (unmatchedSamples[res.reason] ??= [])
    if (s.length < 5) s.push({ url, hint: res.hint ?? '' })
  }
}
report.unmatchedSamples = unmatchedSamples
report.collisions = collisionAddr

/* coverage: published articles with >=1 legacy URL per domain */
const recordIds = new Set(
  readdirSync(RECORDS)
    .filter((f) => /^\d+\.json$/.test(f))
    .map((f) => Number(f.slice(0, -5))),
)
report.publishedInExport = published.length
report.recordFiles = recordIds.size
report.publishedWithoutRecord = published.filter((a) => !recordIds.has(a.id)).map((a) => a.id)
report.recordsNotPublished = [...recordIds].filter((id) => !articles.get(id)?.published).sort((a, b) => a - b)
const pre = published.filter((a) => a.date && a.date <= SNAPSHOT)
for (const d of DOMAINS) {
  const coveredHere = covered[d]
  const preMissing = pre.filter((a) => !coveredHere.has(a.id))
  const hiddenOnly = preMissing.filter((a) => hidden[d].has(a.id))
  const other = preMissing.filter((a) => !hidden[d].has(a.id))
  report.coverage[d] = {
    preSnapshotPublished: pre.length,
    covered: pre.length - preMissing.length,
    hiddenByCollision: hiddenOnly.length,
    noUrlOther: other.length,
    noUrlOtherSamples: other.slice(0, 10).map((a) => ({ id: a.id, date: a.date, title: a.title })),
  }
}
const anyCovered = new Set(DOMAINS.flatMap((d) => [...covered[d]]))
const anyHidden = new Set(DOMAINS.flatMap((d) => [...hidden[d]]))
const noUrl = published.filter((a) => !anyCovered.has(a.id))
const byBucket = {}
for (const a of noUrl.filter((x) => !anyHidden.has(x.id))) {
  const k = !a.date ? 'no date' : a.date > SNAPSHOT ? `after snapshot ${a.date.slice(0, 7)}` : a.date === SNAPSHOT ? 'snapshot day' : `before snapshot ${a.date.slice(0, 4)}`
  bump(byBucket, k)
}
report.recordsWithNoLegacyUrl = {
  total: noUrl.length,
  hiddenByCollisionOnly: noUrl.filter((a) => anyHidden.has(a.id)).length,
  byDate: Object.fromEntries(Object.entries(byBucket).sort()),
  preSnapshotSamples: noUrl
    .filter((a) => !anyHidden.has(a.id) && (!a.date || a.date < SNAPSHOT))
    .slice(0, 15)
    .map((a) => ({ id: a.id, date: a.date, datePublished: a.datePublished, title: a.title, hidden: anyHidden.has(a.id) })),
}
report.coverageAllDomains = {
  preSnapshotPublished: pre.length,
  coveredOnAllThree: pre.filter((a) => DOMAINS.every((d) => covered[d].has(a.id))).length,
  coveredOnAtLeastOne: pre.filter((a) => anyCovered.has(a.id)).length,
}

/* the normaliser's unresolved body links */
const normReportPath = join(RECORDS, '_report.json')
if (existsSync(normReportPath)) {
  const links = JSON.parse(readFileSync(normReportPath, 'utf8')).unresolvedLinks ?? []
  const results = links.map(({ id, href }) => {
    const p = splitUrl(href)
    const r = p ? resolveLegacy(p.host, p.path, p.query) : { reason: 'malformed-url' }
    return r.method
      ? { from: id, href, resolved: true, method: r.method, tier: r.tier, to: r.id, target: `/archive/${r.id}/${recordSlug(r.id)}` }
      : { from: id, href, resolved: false, reason: r.reason, hint: r.hint || (p && ARTICLE_PATH[p.host] ? nearest(p.host, safeDecode(ARTICLE_PATH[p.host].exec(p.path)?.[1] ?? '')) : '') }
  })
  report.unresolvedLinks = { total: results.length, resolved: results.filter((r) => r.resolved).length, results }
}

/* ------------------------------------------------------------------ output */

mkdirSync(OUT, { recursive: true })
const byDomainUrl = (a, b) => (a.domain < b.domain ? -1 : a.domain > b.domain ? 1 : a.url < b.url ? -1 : a.url > b.url ? 1 : 0)
redirects.sort(byDomainUrl)
unmatched.sort(byDomainUrl)
writeFileSync(
  join(OUT, 'redirects.csv'),
  [csvRow(['legacy_url', 'domain', 'method', 'id', 'target_url']), ...redirects.map((r) => csvRow([r.url, r.domain, r.method, r.id, r.target]))].join('\n') + '\n',
)
writeFileSync(
  join(OUT, 'unmatched.csv'),
  [csvRow(['legacy_url', 'domain', 'reason', 'hint']), ...unmatched.map((r) => csvRow([r.url, r.domain, r.reason, r.hint]))].join('\n') + '\n',
)
report.totals = { redirects: redirects.length, unmatched: unmatched.length, seconds: (Date.now() - started) / 1000 }
writeFileSync(join(OUT, 'report.json'), JSON.stringify(report, null, 2) + '\n')

const methods = ['id', 'slug', 'slug-latest']
const md = []
md.push('# Legacy article redirect map', '')
md.push(`Baseline ${report.baselineRows} rows; article rows ${Object.values(report.articleRows).reduce((a, b) => a + b, 0)}; non-article rows skipped ${Object.values(report.skippedFamilies).reduce((a, b) => a + b, 0)}.`, '')
md.push('| Domain | Article URLs | ' + methods.join(' | ') + ' | unmatched |', '|---|---|' + methods.map(() => '---|').join('') + '---|')
for (const d of DOMAINS) {
  const m = report.methods[d] ?? {}
  const u = Object.values(report.unmatched[d] ?? {}).reduce((a, b) => a + b, 0)
  md.push(`| ${d} | ${report.articleRows[d] ?? 0} | ${methods.map((k) => m[k] ?? 0).join(' | ')} | ${u} |`)
}
md.push('', `Redirects ${redirects.length}, unmatched ${unmatched.length}.`, '')
md.push('## Unmatched by reason', '')
for (const d of DOMAINS) md.push(`- ${d}: ${JSON.stringify(report.unmatched[d] ?? {})}`)
md.push('', '## Collisions (slug-latest)', '')
md.push('| Domain | Reused addresses | Articles hidden | Differs from oldest-edition | Max reuse |', '|---|---|---|---|---|')
for (const d of DOMAINS) {
  const c = collisionAddr[d]
  md.push(`| ${d} | ${c.addresses} | ${c.articles} | ${c.parityDiff} | ${c.maxReuse} |`)
}
for (const d of DOMAINS) {
  const em = collisionAddr[d].entriesMismatch
  if (em) md.push(`- ${d}: ${em.count} addresses where sitemap entries != candidates (${em.explainedBySnapshot} explained by post-snapshot editions); latest edition is post-snapshot on ${collisionAddr[d].latestIsPostSnapshot ?? 0}.`)
}
md.push('', '## Lookup tiers used (slug methods)', '')
for (const d of DOMAINS) md.push(`- ${d}: ${JSON.stringify(report.tiers[d] ?? {})}`)
md.push('', `\`?id=\` whose slug disagrees with that id's legacy slugs: ${report.idSlugDisagrees.count}.`)
md.push(`\`?id=\` not published, fell back to slug: ${JSON.stringify(report.idFallbackToSlug)}.`)
md.push('', '## Coverage (published, article_date <= ' + SNAPSHOT + ')', '')
md.push('| Domain | Pre-snapshot | Covered | Hidden by collision | No URL, other |', '|---|---|---|---|---|')
for (const d of DOMAINS) {
  const c = report.coverage[d]
  md.push(`| ${d} | ${c.preSnapshotPublished} | ${c.covered} | ${c.hiddenByCollision} | ${c.noUrlOther} |`)
}
md.push('', `Records with no legacy URL on any domain: ${report.recordsWithNoLegacyUrl.total}, of which ${report.recordsWithNoLegacyUrl.hiddenByCollisionOnly} sit behind a reused address; the rest by date: ${JSON.stringify(report.recordsWithNoLegacyUrl.byDate)}.`)
md.push(`Covered on all three domains: ${report.coverageAllDomains.coveredOnAllThree} of ${report.coverageAllDomains.preSnapshotPublished} pre-snapshot; on at least one: ${report.coverageAllDomains.coveredOnAtLeastOne}.`)
if (report.unresolvedLinks) md.push('', `Normaliser unresolved body links: ${report.unresolvedLinks.resolved} of ${report.unresolvedLinks.total} now resolve.`)
md.push('', `Run time ${report.totals.seconds.toFixed(1)} s.`)
writeFileSync(join(OUT, 'report.md'), md.join('\n') + '\n')
console.log(md.join('\n'))
