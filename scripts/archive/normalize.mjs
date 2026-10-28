#!/usr/bin/env node
/**
 * Legacy `cms_articles` rows -> one clean JSON record per archive article.
 *
 * Input is a phpMyAdmin JSON export: an array whose `{"type":"table"}` member
 * carries `data`, an array of rows whose values are all strings. Several
 * exports of the same table can be merged by `article_id`; later files add or
 * override columns (the second sample export only carried the brand flags).
 * Output is `<out>/<id>.json` per published row. Nothing here touches Sanity,
 * R2, Algolia or the network: this is the pure first stage, and
 * `normalizeRow()` is exported so the upload and indexing stages reuse it.
 *
 * Measured on the 107-row sample (`article_id % 1000 = 7`) on 2026-10-14.
 * Numbers in these comments come from that sample, not from the full table,
 * and move with a full export. Re-run with `--report`.
 *
 * ## What the record has to get right
 *
 * 1. Publication is two eras. From 2014 a brand owns
 *    an article iff its `<brand>_article_type` is non-empty; verified on live
 *    listings, 21 of 21 cells. Before 2014 the only signals are
 *    `article_wba_only` and the `*_site_publish` flags, and the rule in
 *    `resolvePublications()` is an assumption until the client confirms it.
 *
 * 2. `article_date` is the editorial date the live site shows (204007 shows
 *    28 March 2025, `date_published` says 2025-08-16). `date` uses it and is
 *    null for `0000-00-00`; `date_published` is kept under `legacy`.
 *
 * 3. Bodies come in three shapes: 8 plain text with `\r\n\r\n` paragraphs,
 *    4 inline-tags-only, 95 block HTML with uppercase and unclosed `<p>`.
 *    Tagless bodies go through a port of WordPress `wpautop()`, then
 *    everything goes through an HTML5 parser and an element allowlist.
 *
 * 4. Security (README section 3, "There are no user accounts"): no
 *    `javascript:` href survives, no `on*` attribute survives, and only
 *    YouTube, Vimeo and libsyn podcast-player iframes survive, each rebuilt
 *    from a validated id or path. 173007 and 177007 embed lead-gen forms
 *    with `onload="javascript:..."`; both are dropped and reported. Every
 *    field other than `bodyHtml` and the `EVENT_HTML` fields is plain text
 *    with no markup at all; 171536 had `<script src="https://xs.ht">` (an
 *    XSS probe) in its keywords, which `injectedMarkup` reports.
 *
 * 5. Author job title and company are present on 52 and 5 of 107 rows, but
 *    together on 0 of 40 measured archive pages (README section 4). They are
 *    stored for completeness and must never be rendered: `author.name` is the
 *    only display field.
 *
 * 6. Media. With `--media <dir>` (the mirror of FTP `/cms/images`, holding
 *    `app/`), every mapped media path is checked against the disk: exact,
 *    then case-insensitive (R2 keys are case-sensitive, the legacy IIS was
 *    not), then the same path under `app/za/`, which mirrors `app/` and holds
 *    files missing from it. A miss nulls the field or drops the `<img>`.
 *    `_media.json` lists the files the records reference: the upload manifest.
 *
 * 7. Legacy keyword searches (~59,400 links, plus the `[tag|...]`
 *    shortcodes) become `/search?q=…&kind=company|person|topic` on the new
 *    site; a link whose keyword is unreadable is unwrapped.
 *
 * 8. A few rows are UTF-8 read as cp1252 and saved back (`â€œWealthâ€`,
 *    4216). `repairMojibake()` undoes that per run of cp1252 characters and
 *    keeps a repair only when it lowers the marker count. Bytes already lost
 *    to U+FFFD stay lost; the report lists what is still flagged.
 *
 * ## Usage
 *
 *   node scripts/archive/normalize.mjs \
 *     --in ~/wb-archive-data/export/articles-1.json \
 *     --in ~/wb-archive-data/export/articles-2.json \
 *     --out ~/wb-archive-data/records --report \
 *     [--media ~/wb-archive-data/media] [--workers N]
 *
 * Rows are normalised on `os.availableParallelism() - 1` worker threads
 * (jsdom is the cost: 2 h 50 min single-threaded for the full table).
 * `--workers 1` runs in-process; output is byte-identical either way.
 *
 * As a module:
 *
 *   import {buildContext, normalizeRow} from './scripts/archive/normalize.mjs'
 *   const ctx = buildContext(rows)
 *   const record = normalizeRow(row, ctx)   // null when not published
 *
 * ## Dependencies
 *
 * jsdom (MIT), already a devDependency. Nothing else.
 */

import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { availableParallelism, homedir } from 'node:os'
import { join, resolve } from 'node:path'
import { isMainThread, parentPort, Worker, workerData } from 'node:worker_threads'
import { JSDOM } from 'jsdom'

/* -------------------------------------------------------------------------- */
/* Constants                                                                  */
/* -------------------------------------------------------------------------- */

/** Where `…/cms/images/{path}` lands. The R2 media origin serves this prefix. */
export const ARCHIVE_MEDIA_PREFIX = '/archive-media/'

/** Archive article URL, README section 3: id first, slug cosmetic. */
export const archivePath = (id, slug) => `/archive/${id}/${slug || 'article'}`

/** Brand keys from `src/brands.ts`. */
const BRAND_COLUMNS = {
  wealthbriefing: 'wb_article_type',
  wealthbriefingasia: 'wba_article_type',
  familywealthreport: 'fwr_article_type',
}

/** Legacy hosts that served articles. `fwreport.com` is FWR's alias domain. */
const LEGACY_HOSTS = {
  'wealthbriefing.com': 'wealthbriefing',
  'wealthbriefingasia.com': 'wealthbriefingasia',
  'familywealthreport.com': 'familywealthreport',
  'fwreport.com': 'familywealthreport',
}

/** Base for resolving relative hrefs, by the article's first publication. */
const LEGACY_BASE = {
  wealthbriefing: 'https://www.wealthbriefing.com/html/',
  wealthbriefingasia: 'https://www.wealthbriefingasia.com/',
  familywealthreport: 'https://www.familywealthreport.com/',
}

export const LINK_SCHEMES = ['http:', 'https:', 'mailto:']

/** The era switch: per-brand type columns from 2014. */
const ERA_2_FROM_YEAR = 2014

/**
 * Columns that are operational state, not content. Never exported.
 * Anything else that is non-empty must be mapped; `--report` checks it.
 */
const OMIT_EXACT = new Set([
  'article_advert_tracking',
  'article_google',
  'article_html',
  'bb_id',
  'sec_id',
  'article_video_ftec',
  'article_video_ev',
  'article_image_dab',
  'file_data',
  'locked',
  'lock_detail',
])
const OMIT_PATTERNS = [
  /^article_hit/,
  /^article_rate/,
  /^daily_email/,
  /^(wb|wba|fwr|cm|iwr)_email$/,
  /^article_(wb|wba|fwr|cm|iwr)_email$/,
  /_leading$/,
]

export function isOmittedColumn(column) {
  return OMIT_EXACT.has(column) || OMIT_PATTERNS.some((pattern) => pattern.test(column))
}

/** Every column `normalizeRow()` reads. Kept by hand; the report diffs it. */
export const MAPPED_COLUMNS = new Set([
  // identity, text
  'article_id', 'is_published', 'title', 'summary', 'body', 'article_date',
  // publication and types
  'article_type', 'article_type_sec', 'article_type_wba', 'article_type_fwr', 'article_type_cm',
  'wb_article_type', 'wba_article_type', 'fwr_article_type', 'cm_article_type',
  'wb_site_publish', 'wba_site_publish', 'fwr_site_publish', 'iwr_site_publish', 'wtb_site_publish',
  'article_wba_only', 'article_iwr_only', 'article_cm_only', 'article_fwr_only',
  // author
  'author_id', 'author_name', 'author_location', 'author_job_title', 'author_company',
  'author_image', 'author_image_display',
  // taxonomy
  'article_category', 'article_secondary_category', 'article_third_category',
  'article_forth_category', 'article_keywords', 'article_company', 'article_region',
  'article_country', 'article_wealth_careers', 'article_category_cm', 'article_category_cm_2',
  'article_category_cm_3', 'article_announcements_cm', 'article_industryviews_cm',
  // media
  'article_image', 'article_image_sponsored', 'article_video', 'article_video_id',
  'article_video_file', 'article_audio', 'article_audio_file', 'filename', 'filetype', 'filesize',
  // event
  'article_venue', 'article_time', 'article_end_date', 'agenda', 'logistics', 'speakers',
  'register', 'sponsors', 'eventimage', 'eventimageurl', 'eventregisterurl',
  'eventsponsorsection', 'article_sponsor', 'article_price', 'article_email', 'article_website',
  'article_phone', 'contact_name',
  // legacy
  'date_published', 'date_submitted', 'article_free', 'article_premium', 'article_exclusive',
  'article_research', 'exclude_from_search',
])

/** Event columns whose content is HTML (agenda tables, speaker lists) and goes through the body cleaner. */
const EVENT_HTML = {
  agenda: 'agenda',
  logistics: 'logistics',
  speakers: 'speakers',
  register: 'register',
  sponsors: 'sponsors',
  eventsponsorsection: 'sponsorSection',
}

/** Event columns that are plain text: tags stripped, entities decoded (7 venues were `<a>` links). */
const EVENT_TEXT = {
  article_venue: 'venue',
  article_time: 'time',
  article_price: 'price',
  article_email: 'email',
  article_website: 'website',
  article_phone: 'phone',
  contact_name: 'contactName',
  article_sponsor: 'sponsor',
  eventregisterurl: 'registerUrl',
}

/* -------------------------------------------------------------------------- */
/* Small value helpers                                                        */
/* -------------------------------------------------------------------------- */

/** Trimmed string, or null for missing, empty, whitespace-only. */
function str(value) {
  if (value === undefined || value === null) return null
  const out = String(value).replace(/^[\s ]+|[\s ]+$/g, '')
  return out === '' ? null : out
}

/** MySQL zero date and missing values both become null. */
function mysqlDate(value) {
  const s = str(value)
  if (!s || /^0000-00-00/.test(s)) return null
  return s
}

const ynFlag = (value) => (str(value) === null ? null : str(value).toUpperCase() === 'Y')
const bitFlag = (value) => (str(value) === null ? null : str(value) === '1')

/** "Yes"/"No" columns: keep the raw value, these are legacy facts not features. */
const raw = (value) => str(value)

function safeDecode(segment) {
  try {
    return decodeURIComponent(segment)
  } catch {
    return segment
  }
}

/** Collapse every whitespace run, NBSP included, to one space. */
const collapse = (text) => text.replace(/[\s ]+/g, ' ').trim()

const MOJIBAKE = /Ã.|â€|Â/
const MOJIBAKE_ALL = new RegExp(MOJIBAKE.source, 'g')
const countMojibake = (text) => text.match(MOJIBAKE_ALL)?.length ?? 0

/**
 * cp1252 bytes 0x80-0x9f. The five bytes cp1252 leaves undefined decode to
 * the C1 control of the same value (WHATWG), so they map back to themselves.
 * 0xa0-0xff are Latin-1 and map to themselves too.
 */
const CP1252_80 = '€\x81‚ƒ„…†‡ˆ‰Š‹Œ\x8dŽ\x8f\x90‘’“”•–—˜™š›œ\x9džŸ'
const CP1252 = new Map([...CP1252_80].map((ch, index) => [ch, 0x80 + index]))
for (let byte = 0xa0; byte <= 0xff; byte++) CP1252.set(String.fromCharCode(byte), byte)
const CP1252_RUN = new RegExp(
  `[${[...CP1252.keys()].map((ch) => `\\u${ch.charCodeAt(0).toString(16).padStart(4, '0')}`).join('')}]{2,}`,
  'g',
)
const UTF8 = new TextDecoder('utf-8', { fatal: true })

/**
 * A character already lost to U+FFFD: `ï¿½` (U+FFFD seen through cp1252,
 * 149 in 24 bodies, 2007-08), U+FFFD itself, and the twice-mangled
 * `Ã¯ï¿½ï¿½` / `Ã¢ï¿½ï¿½` (22570, 23828, 24634). The original cp1252
 * character is gone, so `restoreLost()` puts back the one the context
 * implies, and leaves the rest for the report.
 */
const LOST_CHAR = /(?:Ã[\u0080-\u00ff])?(?:ï¿½|\uFFFD)+(?:'(?=\p{L}))?/gu
const LETTER = /\p{L}/u
const CLOSING_PUNCT = /[.,;:!?)\]'"’]/

/**
 * Context rules, in order; `prev`/`next` are the characters around the lost
 * one, with a tag end (`<P>X`) counting as the start of a paragraph.
 *
 *   letter X s|t|d|m|ll|re|ve|'  -> ’   `court’s`, `weren’t` (`KongX's` keeps one);
 *     any other letter stays lost (`headedXinternal`, 22594)
 *   start X FWR           -> –   the `-FWR` sign-off
 *   digit X non-digit     -> °   `75°`
 *   start|space X digit   -> £   `about £151 million`
 *   space X space         -> –   `recently – albeit`
 *   start|space|( X letter|[  -> “   `<p>“Our`, ` “Combined`, `“[Head’s]`
 *   letter|punct X space|<|end|punct -> ”, except a plural possessive: after
 *     `s` with no “ open in the paragraph, `investors’ heightened`, `UBS’`
 */
function restoreLost(value, stats) {
  if (typeof value !== 'string' || !LOST_CHAR.test(value)) return value
  LOST_CHAR.lastIndex = 0
  let open = false
  let last = 0
  return value.replace(LOST_CHAR, (match, offset, whole) => {
    if (/<\/?p\b|\n\s*\n/i.test(whole.slice(last, offset))) open = false
    last = offset + match.length
    // `Kong X's`: the apostrophe is in the match, so it can be absorbed.
    const tail = match.endsWith("'") ? "'" : ''
    const prev = offset === 0 ? '' : whole[offset - 1]
    const next = tail || (whole[offset + match.length] ?? '')
    const start = prev === '' || prev === '>' || /\s/.test(prev)
    const nextEnd = next === '' || next === '<' || /\s/.test(next) || CLOSING_PUNCT.test(next)
    const hit = (rule, char) => {
      bump(stats.rules, rule)
      return rule === 'apostrophe' ? char : char + tail
    }
    const after = tail ? '' : whole.slice(offset + match.length, offset + match.length + 4)
    const contraction = /^(?:s|t|d|m|ll|re|ve)(?!\p{L})/iu.test(after)
    if (LETTER.test(prev) && (contraction || next === "'" || next === '’')) return hit('apostrophe', '’')
    if (start && /\d/.test(next)) return hit('pound', '£')
    // `Mandell. XFWR</p>`: the sign-off is `-FWR` elsewhere (23522).
    if (start && /^FWR\b/.test(after)) return hit('enDash', '–')
    // `an angle of 75X.` (23480).
    if (/\d/.test(prev) && !/\d/.test(next)) return hit('degree', '°')
    if (prev !== '' && /[ \t]/.test(prev) && /[ \t]/.test(next)) return hit('enDash', '–')
    if ((start || prev === '(') && (LETTER.test(next) || next === '[') && !/^FWR\b/.test(whole.slice(offset + match.length))) {
      open = true
      return hit('openQuote', '“')
    }
    if ((LETTER.test(prev) || CLOSING_PUNCT.test(prev)) && nextEnd) {
      if (!open && /s/i.test(prev) && !CLOSING_PUNCT.test(next)) return hit('apostrophe', '’')
      open = false
      return hit('closeQuote', '”')
    }
    stats.leftover.push(whole.slice(Math.max(0, offset - 20), offset + match.length + 20).replace(/\s+/g, ' '))
    return match
  })
}

/**
 * One run of cp1252 characters -> cp1252 bytes, then each complete UTF-8
 * sequence in them decoded. Greedy per sequence, so a correct character next
 * to the mojibake (`’â€™`) does not sink the whole run.
 */
function repairRun(run) {
  // `ï¿½` is U+FFFD seen through cp1252: bytes already lost (22570,
  // `MDTÃ¯ï¿½ï¿½s`). Decoding around it only trades one garble for another.
  if (run.includes('ï¿½')) return run
  const chars = [...run]
  const bytes = chars.map((ch) => CP1252.get(ch))
  let out = ''
  let index = 0
  while (index < bytes.length) {
    const lead = bytes[index]
    const size = lead >= 0xc2 && lead <= 0xdf ? 2 : lead >= 0xe0 && lead <= 0xef ? 3 : lead >= 0xf0 && lead <= 0xf4 ? 4 : 0
    if (size && index + size <= bytes.length) {
      try {
        const decoded = UTF8.decode(Uint8Array.from(bytes.slice(index, index + size)))
        if (!decoded.includes('�')) {
          out += decoded
          index += size
          continue
        }
      } catch {
        // not a UTF-8 sequence: keep the character as it is
      }
    }
    out += chars[index]
    index++
  }
  return out
}

/**
 * UTF-8 read as cp1252 -> the original text. Only strings the mojibake guard
 * flags are touched, and the repair is kept only when it lowers the count.
 */
export function repairMojibake(value) {
  if (typeof value !== 'string' || !MOJIBAKE.test(value)) return value
  const repaired = value.replace(CP1252_RUN, repairRun)
  return countMojibake(repaired) < countMojibake(value) ? repaired : value
}

const lostStats = () => ({ rules: {}, leftover: [] })

/**
 * Every string column through `restoreLost()` then `repairMojibake()`; a
 * copy only when something changed. `stats.mojibake` says whether the
 * mojibake repair changed anything.
 */
function repairRow(row, stats = lostStats()) {
  let out = row
  for (const [column, value] of Object.entries(row)) {
    if (column === 'file_data') continue
    const restored = restoreLost(value, stats)
    const repaired = repairMojibake(restored)
    if (repaired !== restored) stats.mojibake = true
    if (repaired === value) continue
    if (out === row) out = { ...row }
    out[column] = repaired
  }
  return out
}

/* -------------------------------------------------------------------------- */
/* DOM                                                                        */
/* -------------------------------------------------------------------------- */

/**
 * One jsdom window per chunk of rows, used only for `DOMParser`. A window
 * per row leaks about 1.5 MB each (measured in html-to-portable-text.mjs);
 * one for the whole table slows every parse down (see `processChunk()`).
 */
let sharedParser = null
function parseDocument(html) {
  if (!sharedParser) {
    const { DOMParser } = new JSDOM('').window
    sharedParser = new DOMParser()
  }
  return sharedParser.parseFromString(`<!doctype html><body>${html}`, 'text/html')
}

/**
 * Entities decoded, tags dropped, whitespace collapsed. Every non-HTML string
 * in the record goes through here, so none of them carries markup: script and
 * style content is dropped with its tag, shortcodes keep their display text,
 * and a stray `<` or `>` left over from a broken tag (`Investec<...`, 6149;
 * `State Street Global Advisors<`, 32547) is removed.
 */
function plainText(value) {
  let s = str(value)
  if (!s) return null
  s = s.replace(SHORTCODE, '$2').replace(SHORTCODE_UNCLOSED, '$2')
  if (/[<&]/.test(s)) {
    const { body } = parseDocument(s)
    for (const el of Array.from(body.querySelectorAll([...DROP].join(',')))) el.remove()
    s = body.textContent || ''
  }
  return collapse(s.replace(/[<>]/g, '')) || null
}

/* -------------------------------------------------------------------------- */
/* Slugs                                                                      */
/* -------------------------------------------------------------------------- */

/** Letters NFKD does not decompose. */
const TRANSLIT = { ß: 'ss', æ: 'ae', Æ: 'ae', ø: 'o', Ø: 'o', œ: 'oe', Œ: 'oe', ł: 'l', Ł: 'l', đ: 'd', Đ: 'd', þ: 'th', ð: 'd' }

/**
 * Our archive slug. Cosmetic (the id resolves the article), so it only has to
 * be stable and readable. Apostrophes are removed rather than hyphenated so
 * "Who's" reads `whos`, not `who-s`.
 */
export function archiveSlug(title) {
  let s = String(title ?? '')
    .replace(/[ßæÆøØœŒłŁđĐþð]/g, (ch) => TRANSLIT[ch])
    .normalize('NFKD')
    .replace(/\p{M}+/gu, '')
    .toLowerCase()
    .replace(/['’‘`]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  if (s.length > 80) {
    const cut = s.slice(0, 81)
    const boundary = cut.lastIndexOf('-')
    s = (boundary > 0 ? cut.slice(0, boundary) : s.slice(0, 80)).replace(/-+$/, '')
  }
  return s || 'article'
}

/**
 * Legacy slugs, decoded and lowercased, from sample-analysis.md section 12.
 * Matched 106 of 107 sample titles on each domain (the miss postdates the
 * baseline). Uses the RAW title: a trailing space is a trailing `-` there.
 *
 *   WB:       lowercase; `-` -> `_dash_`; if any non-ASCII, drop `?` and every
 *             non-ASCII char; space -> `-`.
 *   WBA/FWR:  `-` -> `_dash_`; space -> `-`; case preserved (compared
 *             lowercased here, WB links also appear in mixed case: 201007).
 */
export function legacySlugs(rawTitle) {
  const title = String(rawTitle ?? '')
  const dashed = title.replace(/-/g, '_dash_')
  const nonAscii = /[^\x00-\x7f]/
  const wb = (nonAscii.test(dashed) ? dashed.replace(/\?/g, '').replace(/[^\x00-\x7f]/g, '') : dashed)
    .toLowerCase()
    .replace(/ /g, '-')
  const other = dashed.replace(/ /g, '-').toLowerCase()
  return wb === other ? [wb] : [wb, other]
}

/* -------------------------------------------------------------------------- */
/* Context: what one run knows about every article in it                      */
/* -------------------------------------------------------------------------- */

/**
 * Link rewriting needs every title in the run: `slugById` for `?id=N` links
 * and `legacySlugIndex` for `/article.php/{slug}` links. A slug can be shared
 * by many ids (the worst WB address is reused 105 times); the contract
 * Schedule redirects to the most recent edition, so the index keeps the
 * candidate with the latest `article_date`, ties broken by the higher id.
 */
export function buildContext(rows) {
  const slugById = new Map()
  const legacySlugIndex = new Map()
  for (const row of rows) {
    if (str(row.is_published) !== '1') continue
    const id = Number(row.article_id)
    const { types } = resolvePublications(row)
    slugById.set(id, archiveSlug(titleOf(row, types).title))
    const date = mysqlDate(row.article_date) ?? ''
    for (const key of legacySlugs(row.title)) {
      const current = legacySlugIndex.get(key)
      if (!current || date > current.date || (date === current.date && id > current.id)) {
        legacySlugIndex.set(key, { id, date })
      }
    }
  }
  return { slugById, legacySlugIndex, media: null, report: null }
}

/**
 * Display title. Six rows have none (3073, 40000: Quote of the Week); they
 * take their first type label, else "Untitled", and `legacy.titleMissing`.
 * Shared with `buildContext()` so links and the record agree on the slug.
 */
function titleOf(row, types = resolvePublications(row).types) {
  const title = plainText(repairMojibake(restoreLost(row.title, lostStats())))
  if (title) return { title, missing: false }
  const label = Object.values(types).map(plainText).find(Boolean)
  return { title: label ?? 'Untitled', missing: true }
}

/* -------------------------------------------------------------------------- */
/* Publication rule                                                           */
/* -------------------------------------------------------------------------- */

/**
 * Which of our three brands an article belongs to, and its type on each.
 *
 * Era 2 (article_date year >= 2014) is verified: a brand owns the article iff
 * its `<brand>_article_type` is non-empty (publication-rule-check.md).
 * `cm_article_type` (Compliance Matters, a WB section, ends 2021) is not one
 * of our brands and goes to `extraBrands`.
 *
 * Era 1 (before 2014, or no date) is an ASSUMPTION pending client
 * confirmation: `article_wba_only='Y'` -> WBA only; otherwise WB, plus FWR
 * when `fwr_site_publish=1`. `iwr`/`wtb` flags and `article_cm_only` are
 * unmapped brands and go to `extraBrands`.
 *
 * IWR, WTB and CM are closed publications; the client said to discard the
 * labels (2026-10-14). Their articles stay: 3,608 era-2 articles are CM-only,
 * and their legacy URLs are in the WB sitemaps, so they need a live archive
 * page. A CM-only article goes to WB with `cm_article_type` as its type.
 * Only an orphan with no signal at all sets `defaulted`, which the report lists.
 */
export function resolvePublications(row) {
  const date = mysqlDate(row.article_date)
  const year = date ? Number(date.slice(0, 4)) : null
  const publications = []
  const types = {}
  const extraBrands = []

  if (year !== null && year >= ERA_2_FROM_YEAR) {
    for (const [brand, column] of Object.entries(BRAND_COLUMNS)) {
      const type = str(row[column])
      if (type) {
        publications.push(brand)
        types[brand] = type
      }
    }
    if (str(row.cm_article_type)) extraBrands.push('cm')
  } else {
    if (ynFlag(row.article_wba_only)) publications.push('wealthbriefingasia')
    else {
      publications.push('wealthbriefing')
      if (bitFlag(row.fwr_site_publish)) publications.push('familywealthreport')
    }
    if (bitFlag(row.iwr_site_publish)) extraBrands.push('iwr')
    if (bitFlag(row.wtb_site_publish)) extraBrands.push('wtb')
    if (ynFlag(row.article_cm_only)) extraBrands.push('cm')
    const type = str(row.article_type)
    if (type) for (const brand of publications) types[brand] = type
  }

  let defaulted = false
  if (publications.length === 0) {
    publications.push('wealthbriefing')
    const cmType = str(row.cm_article_type)
    if (cmType) types.wealthbriefing = cmType
    else defaulted = true
  }
  return { era: year !== null && year >= ERA_2_FROM_YEAR ? 2 : 1, publications, types, extraBrands, defaulted }
}

/* -------------------------------------------------------------------------- */
/* Body: string stage                                                         */
/* -------------------------------------------------------------------------- */

/** Elements wpautop treats as blocks, i.e. never wraps in `<p>`. */
const AUTOP_BLOCKS =
  'table|thead|tfoot|caption|col|colgroup|tbody|tr|td|th|div|dl|dd|dt|ul|ol|li|pre|form|map|area|blockquote|address|math|style|p|h[1-6]|hr|fieldset|legend|section|article|aside|hgroup|header|footer|nav|figure|figcaption|details|menu|summary|iframe'

const HAS_BLOCK = new RegExp(`<(?:${AUTOP_BLOCKS}|br)\\b`, 'i')

/**
 * Port of WordPress `wpautop($pee, $br = true)`, copied from
 * `scripts/html-to-portable-text.mjs` (same faithful port, minus the notes).
 * Here it only runs on bodies with no block tag at all: 12 of 107, the
 * 2005-2008 plain-text and inline-links-only rows.
 */
function wpautop(html, br = true) {
  if (!html || !html.trim()) return ''
  const blocks = AUTOP_BLOCKS
  let pee = `${html}\n`

  pee = pee.replace(/<br\s*\/?>\s*<br\s*\/?>/gi, '\n\n')
  pee = pee.replace(new RegExp(`(<(?:${blocks})(?:\\s[^>]*)?/?>)`, 'gi'), '\n\n$1')
  pee = pee.replace(new RegExp(`(</(?:${blocks})>)`, 'gi'), '$1\n\n')
  pee = pee.replace(/\n\n+/g, '\n\n')

  const parts = pee.split(/\n\s*\n/).filter((part) => part.trim() !== '')
  pee = parts.map((part) => `<p>${part.replace(/\n+$/, '')}</p>\n`).join('')

  pee = pee.replace(/<p>\s*<\/p>/gi, '')
  pee = pee.replace(new RegExp(`<p>\\s*(</?(?:${blocks})(?:\\s[^>]*)?/?>)\\s*</p>`, 'gi'), '$1')
  pee = pee.replace(/<p>(<li[\s\S]+?)<\/p>/gi, '$1')
  pee = pee.replace(/<p><blockquote([^>]*)>/gi, '<blockquote$1><p>')
  pee = pee.replace(/<\/blockquote><\/p>/gi, '</p></blockquote>')
  pee = pee.replace(new RegExp(`<p>\\s*(</?(?:${blocks})(?:\\s[^>]*)?/?>)`, 'gi'), '$1')
  pee = pee.replace(new RegExp(`(</?(?:${blocks})(?:\\s[^>]*)?/?>)\\s*</p>`, 'gi'), '$1')

  if (br) {
    pee = pee.replace(/(?<!<br \/>)\s*\n/g, '<br />\n')
    pee = pee.replace(new RegExp(`(</?(?:${blocks})(?:\\s[^>]*)?/?>)\\s*<br />`, 'gi'), '$1')
    pee = pee.replace(/<br \/>(\s*<\/?(?:p|li|div|dl|dd|dt|th|pre|td|ul|ol)>)/gi, '$1')
  }

  return pee.replace(/\n<\/p>$/gi, '</p>')
}

/**
 * `[tag|NAME|]Display[/tag]`: 65,626 in 45,262 rows of the full table, from
 * 56007 (2013-07); the middle field is always empty. The live site renders a
 * keyword search for NAME, so the body gets the same legacy `section.php`
 * link a hand-made one would have and `resolveHref()` turns it into a site
 * search. Exact grammar only: prose has `[UBS]`, `[Swiss franc]`.
 * `SHORTCODE_UNCLOSED` is the editor slip `[tag|UBS|UBS[/tag]` (9 rows).
 */
const SHORTCODE = /\[tag\|([^|\][]*)\|[^|\][]*\]([\s\S]*?)\[\/tag\]/gi
const SHORTCODE_UNCLOSED = /\[tag\|([^|\][]*)\|([^|\][]*)\[\/tag\]/gi

/** A shortcode -> the legacy keyword link it stood for. */
function shortcodeLink(match, name, display) {
  const keywords = collapse(name)
  if (!keywords) return display
  return `<a href="https://www.wealthbriefing.com/html/section.php?keywords=${encodeURIComponent(keywords)}">${display}</a>`
}

/* -------------------------------------------------------------------------- */
/* Body: DOM stage                                                            */
/* -------------------------------------------------------------------------- */

const ALLOWED = new Set([
  'p', 'br', 'strong', 'em', 'u', 'a', 'ul', 'ol', 'li', 'blockquote', 'h2', 'h3', 'h4',
  'table', 'thead', 'tbody', 'tr', 'th', 'td', 'img', 'figure', 'figcaption', 'sup', 'sub', 'hr',
])
const RENAME = { b: 'strong', i: 'em', h1: 'h2', h5: 'h4', h6: 'h4' }
const DROP = new Set([
  'script', 'style', 'object', 'embed', 'form', 'input', 'select', 'textarea', 'button',
  'noscript', 'template', 'link', 'meta', 'title', 'head', 'frame', 'frameset', 'applet',
  'svg', 'math',
])
/** Unwrapped elements that stood for a block: become `<p>` when they hold no block. */
const CONTAINERS = new Set(['div', 'center', 'section', 'article', 'header', 'footer', 'aside', 'main', 'address', 'pre'])
const BLOCKS = new Set([
  'p', 'ul', 'ol', 'li', 'blockquote', 'h2', 'h3', 'h4', 'table', 'thead', 'tbody', 'tr', 'th',
  'td', 'figure', 'figcaption', 'hr', 'iframe', ...CONTAINERS,
])
const KEEP_ATTRS = {
  a: ['href'],
  img: ['src', 'alt'],
  iframe: ['src'],
  td: ['colspan', 'rowspan'],
  th: ['colspan', 'rowspan'],
}

/**
 * Legacy keyword searches -> our `/search` `kind`, first match wins. Hrefs
 * in raw bodies of the full table: search_company_keyword ~44,800 (`/html/`,
 * `/cms/`, root, any brand host), search_free_text_author ~14,100,
 * results_cms 331, search_keyword 60, results 39, results_article 57 (WBA,
 * FWR, fwreport.com), section 40, plus every shortcode. Only with a `keywords` param; any other param is dropped
 * (`formsearchtype=all_dates` is a no-op).
 */
const KEYWORD_KINDS = [
  [/\/search_company_keyword\.php$/i, 'company'],
  [/\/search_free_text_author\.php$/i, 'person'],
  [/\/(?:search_[a-z_]+|results[a-z_]*|section)\.php$/i, 'topic'],
]

/**
 * The `keywords` value of a legacy search URL, or null when it is broken.
 * Read from the raw query: company names carry unescaped `&` (`Coutts & Co`,
 * `S&P`), so the value runs to the next `&name=`, not the next `&`. Some
 * values spell markup as entities (`&lt;st1:place&gt;Bridge`): decoded twice,
 * once for the entities and once for the tags they spelled.
 */
function keywordsOf(search) {
  // `formsearchtype=all_dates=Ashburton` (9267): the editor lost `&keywords`.
  const match = /(?:^|&)(?:keywords|formsearchtype=all_dates)=(.*?)(?=&[A-Za-z_]+=|$)/.exec(search.replace(/^\?/, ''))
  if (!match) return null
  let q = match[1].replace(/\+/g, ' ')
  try {
    q = decodeURIComponent(q.replace(/%(?![0-9a-f]{2})/gi, '%25'))
  } catch {
    // malformed UTF-8 escapes: keep them as typed
  }
  for (let pass = 0; pass < 2 && /[<&]/.test(q); pass++) q = parseDocument(q).body.textContent || ''
  q = collapse(q)
  return q && !/[<>]/.test(q) ? q : null
}

/** `/search?q=…&kind=…`, spaces as `%20` like every other path we write. */
const searchPath = (q, kind) => `/search?${new URLSearchParams({ q, kind }).toString().replace(/\+/g, '%20')}`

/** `http://tom.burroughes@wealthbriefing.com` (192007): a mailto typed as http. */
const HTTP_EMAIL = /^https?:\/\/([^/@:\s]+@[^/@:\s]+\.[a-z]{2,})\/?$/i

function bump(map, key, by = 1) {
  map[key] = (map[key] || 0) + by
}

function renameElement(doc, el, tag) {
  const next = doc.createElement(tag)
  while (el.firstChild) next.appendChild(el.firstChild)
  for (const attr of Array.from(el.attributes)) next.setAttribute(attr.name, attr.value)
  el.replaceWith(next)
  return next
}

function unwrap(el) {
  el.replaceWith(...Array.from(el.childNodes))
}

/** `https://player.vimeo.com/video/ID` / `https://www.youtube.com/embed/ID` / libsyn, else null. */
export function embedSrc(rawSrc) {
  let url
  try {
    url = new URL(String(rawSrc).trim(), 'https://example.invalid/')
  } catch {
    return null
  }
  if (url.hostname === 'example.invalid') return null
  const host = url.hostname.replace(/^www\./, '').toLowerCase()
  if (host === 'player.vimeo.com' || host === 'vimeo.com') {
    const id = /(?:^|\/)(\d{5,})(?:\/|$)/.exec(url.pathname)
    return id ? `https://player.vimeo.com/video/${id[1]}` : null
  }
  if (host === 'youtube.com' || host === 'youtube-nocookie.com' || host === 'm.youtube.com') {
    const id =
      /^\/(?:embed|v|shorts)\/([\w-]{6,})/.exec(url.pathname)?.[1] ??
      (url.pathname === '/watch' ? url.searchParams.get('v') : null)
    return id && /^[\w-]+$/.test(id) ? `https://www.youtube.com/embed/${id}` : null
  }
  if (host === 'youtu.be') {
    const id = /^\/([\w-]{6,})/.exec(url.pathname)?.[1]
    return id ? `https://www.youtube.com/embed/${id}` : null
  }
  // Podcast player (189355, 189376). The path carries the player options
  // (`/height/90/theme/custom/...`); every segment must be a plain token.
  if (host === 'html5-player.libsyn.com') {
    const segments = url.pathname.split('/').filter(Boolean)
    if (!/^\/embed\/episode\/id\/\d+(?:\/|$)/.test(url.pathname)) return null
    if (!segments.every((segment) => /^[A-Za-z0-9_-]+$/.test(segment))) return null
    return `https://html5-player.libsyn.com/${segments.join('/')}/`
  }
  return null
}

/**
 * `…/cms/images/{path}` on any host, absolute or relative, -> the R2 path.
 * Segments are decoded then re-encoded so `%20` and raw spaces end up the same.
 */
export function mapMediaUrl(rawUrl) {
  const s = str(rawUrl)
  if (!s) return null
  // `cms//images` (190252); `/images/app/…` without `cms/` on a legacy host (185390).
  const match =
    /(?:^|\/)cms\/+images\/([^?#]+)/i.exec(s) ??
    /^(?:https?:\/\/(?:www\.)?(?:wealthbriefing|wealthbriefingasia|familywealthreport|fwreport)\.com)?\/images\/(app\/[^?#]+)/i.exec(s)
  if (!match) return null
  const path = match[1]
    .split('/')
    .filter(Boolean)
    .map((segment) => encodeURIComponent(safeDecode(segment)))
    .join('/')
  return `${ARCHIVE_MEDIA_PREFIX}${path}`
}

const encodeMediaPath = (rel) => `${ARCHIVE_MEDIA_PREFIX}${rel.split('/').map(encodeURIComponent).join('/')}`

/**
 * The media mirror, walked once: NFC relative path -> on-disk relative path,
 * plus the same keyed case-folded. Dotfiles (`.DS_Store`) are not media.
 * Plain Maps, so the index passes to worker threads as it is.
 */
export function buildMediaIndex(root) {
  const exact = new Map()
  const folded = new Map()
  const files = []
  const visit = (dir, prefix) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.name.startsWith('.')) continue
      const rel = prefix ? `${prefix}/${entry.name}` : entry.name
      if (entry.isDirectory()) visit(join(dir, entry.name), rel)
      else if (entry.isFile()) files.push(rel)
    }
  }
  visit(root, '')
  // Sorted so the first spelling wins a case-fold tie the same way every run.
  for (const rel of files.sort()) {
    const key = rel.normalize('NFC')
    exact.set(key, rel)
    if (!folded.has(key.toLowerCase())) folded.set(key.toLowerCase(), rel)
  }
  return { exact, folded, files: files.length }
}

/**
 * `/archive-media/{path}` -> where the file really is. `how` is `exact`,
 * `caseFixed`, `viaZa` or `missing`; `disk` is the on-disk relative path.
 * No basename-anywhere guessing: a same-named file elsewhere is not proof.
 */
export function locateMedia(mapped, media) {
  const rel = mapped.slice(ARCHIVE_MEDIA_PREFIX.length).split('/').map(safeDecode).join('/').normalize('NFC')
  const za = /^app\/(?!za\/)/i.test(rel) ? `app/za/${rel.slice(4)}` : null
  for (const candidate of za ? [rel, za] : [rel]) {
    const viaZa = candidate === za
    const exact = media.exact.get(candidate)
    if (exact) return { rel, disk: exact, how: viaZa ? 'viaZa' : 'exact' }
    const folded = media.folded.get(candidate.toLowerCase())
    if (folded) return { rel, disk: folded, how: viaZa ? 'viaZa' : 'caseFixed' }
  }
  return { rel, disk: null, how: 'missing' }
}

/**
 * A mapped media path checked against `ctx.media`: the real file's path, or
 * null when it is not on disk. Without a media index the path passes as is.
 */
function resolveMedia(mapped, ctx, issues) {
  if (!ctx.media) return mapped
  const found = locateMedia(mapped, ctx.media)
  issues.mediaRefs.push(found)
  return found.disk ? encodeMediaPath(found.disk) : null
}

/**
 * A WordPress upload on the group site (`clearviewpublishing.com/wp-content/
 * uploads/…`: ~340 featured images, 3 distinct files) or a Zendesk
 * attachment -> its mirrored copy under `external/`, when the mirror has it.
 * Otherwise the URL stays as is.
 */
function mapExternalMedia(value, ctx, issues) {
  if (!ctx.media) return null
  const encode = (path) => path.split('/').filter(Boolean).map((segment) => encodeURIComponent(safeDecode(segment))).join('/')
  const upload = /^https?:\/\/(?:www\.)?clearviewpublishing\.com\/(wp-content\/uploads\/[^?#]+)$/i.exec(value.trim())
  // Zendesk attachment by token (187224): stored by its `name`.
  const zendesk = /^https?:\/\/clearviewpublishing\.zendesk\.com\/attachments\/token\/[^/?#]+\/?\?name=([^&#/]+)$/i.exec(value.trim())
  if (!upload && !zendesk) return null
  const mapped = upload
    ? `${ARCHIVE_MEDIA_PREFIX}external/clearviewpublishing.com/${encode(upload[1])}`
    : `${ARCHIVE_MEDIA_PREFIX}external/clearviewpublishing.zendesk.com/${encode(zendesk[1])}`
  const found = locateMedia(mapped, ctx.media)
  if (!found.disk) return null
  issues.mediaRefs.push(found)
  issues.externalMapped++
  return encodeMediaPath(found.disk)
}

/**
 * The `file_data` blob (209 rows: 197 PDF, 12 JPEG), decoded by a separate
 * step into `attachments/{id}/{filename}` under the media root, with `/`, `\`
 * and control characters replaced by `_` and leading dots by one `_`. Null
 * when there is no media index or the file was not decoded.
 */
function attachmentPath(articleId, filename, ctx, issues) {
  if (!ctx.media) return null
  const name = filename.replace(/[/\\\x00-\x1f]/g, '_').replace(/^\.+/, '_')
  return resolveMedia(`${ARCHIVE_MEDIA_PREFIX}attachments/${str(articleId)}/${encodeURIComponent(name)}`, ctx, issues)
}

/** A media column: mapped path when it is a `cms/images` URL, else the trimmed value. */
function mediaField(value, ctx, issues) {
  const s = str(value)
  if (!s) return null
  const mapped = mapMediaUrl(s)
  if (mapped) return resolveMedia(mapped, ctx, issues)
  const external = mapExternalMedia(s, ctx, issues)
  if (external) return external
  // Mail-merge tracking pixels (`&email=<Account::EMAIL>`, 53811): not media, and not plain text.
  if (/[<>]/.test(s)) {
    issues.droppedMediaValues.push({ value: s })
    return null
  }
  return s
}

/**
 * One link. Returns `{href}` to keep (possibly rewritten), or `{unwrap: reason}`.
 * `ctx` resolves internal article links; `base` resolves relative hrefs.
 */
function resolveHref(rawHref, ctx, base, issues) {
  const href = String(rawHref ?? '').trim()
  if (!href) return { unwrap: 'empty' }
  const email = HTTP_EMAIL.exec(href)
  if (email) {
    issues.mailtoFixed.push(href)
    return { href: `mailto:${email[1]}` }
  }
  let url
  try {
    url = new URL(href, base)
  } catch {
    return { unwrap: 'unparseable' }
  }
  if (!LINK_SCHEMES.includes(url.protocol)) return { unwrap: `scheme ${url.protocol}` }
  if (url.protocol === 'mailto:') return { href: url.href }

  const bare = url.hostname.toLowerCase().replace(/^www\./, '')
  const legacy = LEGACY_HOSTS[bare]
  const path = url.pathname.replace(/\/{2,}/g, '/')
  const kind = legacy && KEYWORD_KINDS.find(([pattern]) => pattern.test(path))?.[1]
  if (kind && (url.searchParams.has('keywords') || /all_dates=./.test(url.search))) {
    const q = keywordsOf(url.search)
    if (!q) {
      issues.keywordBroken.push(href)
      return { unwrap: 'keyword broken' }
    }
    issues.keywordLinks[kind] = (issues.keywordLinks[kind] || 0) + 1
    return { href: searchPath(q, kind), internal: true }
  }

  // A PDF or image on the legacy host (38 links, mostly research reports)
  // moves to R2 with the rest of `cms/images`, but only once it is known to
  // exist: without `--media` the legacy URL stays.
  if (legacy && ctx.media) {
    const mapped = mapMediaUrl(path)
    if (mapped) {
      const resolved = resolveMedia(mapped, ctx, issues)
      return resolved ? { href: resolved, internal: true } : { unwrap: 'media missing' }
    }
  }

  // Article links that do not resolve are unwrapped: after cutover the legacy
  // URL is only a redirect, and one we cannot name. A run must therefore
  // include the full corpus, or links to articles outside it are lost.
  if (legacy) {
    const byId = /^\/(?:html\/)?article\.php(?:\/[^/]*)?$/i.test(path) ? url.searchParams.get('id') : null
    if (byId && /^\d+$/.test(byId)) {
      const id = Number(byId)
      if (!ctx.slugById.has(id)) {
        issues.idLinksOutsideRun.push(id)
        return { unwrap: 'id outside run' }
      }
      return { href: archivePath(id, ctx.slugById.get(id)), internal: true }
    }
    const bySlug = /^\/(?:html\/)?article\.php\/(.+)$/i.exec(path)
    if (bySlug) {
      const key = safeDecode(bySlug[1]).toLowerCase()
      const hit = ctx.legacySlugIndex.get(key)
      if (hit) {
        return { href: archivePath(hit.id, ctx.slugById.get(hit.id)), internal: true }
      }
      url.hostname = `www.${bare}`
      url.pathname = path
      issues.unresolvedLinks.push(url.href)
      return { unwrap: 'unresolved' }
    }
    return { href: url.href, internal: true }
  }
  return { href: url.href, internal: false }
}

function emptyIssues() {
  return {
    droppedIframes: [],
    droppedImages: [],
    droppedElements: {},
    unwrapped: {},
    unwrappedLinks: {},
    unresolvedLinks: [],
    idLinksOutsideRun: [],
    mailtoFixed: [],
    keptIframes: {},
    keywordLinks: {},
    shortcodes: 0,
    keywordBroken: [],
    escapedMarkup: false,
    externalMapped: 0,
    droppedMediaValues: [],
    mediaRefs: [],
  }
}

/**
 * Body HTML -> clean HTML. `issues` collects everything removed or rewritten
 * so the report can list it; nothing is dropped silently.
 */
/** `&lt;NAME attr="v" …&gt;`: every attribute must have a value, so `a &lt; b and c &gt; d` is not a tag. */
const ESCAPED_TAG_SOURCE = String.raw`&lt;\s*(\/?)\s*([A-Za-z][A-Za-z0-9:]*)((?:\s+[A-Za-z_:][-\w:.]*\s*=\s*(?:"[^"<>]*"|'[^'<>]*'|[^\s<>&]+))*)\s*\/?&gt;`
const ESCAPED_TAG = new RegExp(ESCAPED_TAG_SOURCE)
const ESCAPED_TAG_ALL = new RegExp(ESCAPED_TAG_SOURCE, 'g')
/** `< b>Tom Naratil </b>` (1458, 2252, 4086): a real tag with a space after `<`, which HTML reads as text. */
const SPACED_TAG = new RegExp(ESCAPED_TAG_SOURCE.replace('&lt;\\s*', '<\\s+').replace('&gt;', '>'), 'g')

export function cleanHtml(html, ctx, base, issues = emptyIssues()) {
  let source = String(html ?? '').replace(/\r\n?/g, '\n')
  if (!source.trim()) return ''
  // Markup pasted in as escaped text (22275: 31 `&lt;A href=…&gt;&lt;SPAN
  // style=…&gt;`, 23522: `&lt; SPAN …&gt;`). Only whole escaped tags are
  // decoded, so prose like `a &lt; b` stays; the tags then go through the
  // allowlist like any other.
  if (ESCAPED_TAG.test(source)) {
    source = source.replace(ESCAPED_TAG_ALL, (match, slash, name, rest) => `<${slash}${name}${rest}>`)
    issues.escapedMarkup = true
  }
  source = source.replace(SPACED_TAG, (match, slash, name, rest) => {
    issues.escapedMarkup = true
    return `<${slash}${name}${rest}>`
  })
  const link = (match, name, display, offset, whole) => {
    // Inside a tag (`<a href="http://[tag|Barclays|]Barclays[/tag], …`, 168784) only the text can go.
    if (whole.lastIndexOf('<', offset) > whole.lastIndexOf('>', offset)) return display
    issues.shortcodes++
    return shortcodeLink(match, name, display)
  }
  source = source.replace(SHORTCODE, link).replace(SHORTCODE_UNCLOSED, link)
  if (!HAS_BLOCK.test(source)) source = wpautop(source)

  const doc = parseDocument(source)
  walk(doc, doc.body, ctx, base, issues)
  tidy(doc)
  return serialise(doc)
}

function walk(doc, parent, ctx, base, issues) {
  for (const node of Array.from(parent.childNodes)) {
    if (node.nodeType === 3) continue
    if (node.nodeType !== 1) {
      // comments, `<?xml:namespace …>` (parsed as a bogus comment), doctypes
      node.remove()
      continue
    }
    let el = node
    let tag = el.localName.toLowerCase()

    if (DROP.has(tag)) {
      bump(issues.droppedElements, tag)
      el.remove()
      continue
    }
    if (tag === 'iframe') {
      const src = embedSrc(el.getAttribute('src'))
      if (!src) {
        issues.droppedIframes.push(el.getAttribute('src') || '(no src)')
        el.remove()
        continue
      }
      bump(issues.keptIframes, new URL(src).hostname)
      const iframe = doc.createElement('iframe')
      iframe.setAttribute('src', src)
      iframe.setAttribute('allowfullscreen', '')
      el.replaceWith(iframe)
      continue
    }
    if (RENAME[tag]) {
      el = renameElement(doc, el, RENAME[tag])
      tag = RENAME[tag]
    }

    walk(doc, el, ctx, base, issues)

    if (!ALLOWED.has(tag)) {
      bump(issues.unwrapped, tag)
      const holdsBlock = Array.from(el.querySelectorAll('*')).some((child) => BLOCKS.has(child.localName))
      if (CONTAINERS.has(tag) && !holdsBlock && !el.closest('p,li,td,th,h2,h3,h4')) {
        const p = renameElement(doc, el, 'p')
        for (const attr of Array.from(p.attributes)) p.removeAttribute(attr.name)
      } else unwrap(el)
      continue
    }

    const keep = KEEP_ATTRS[tag] || []
    for (const attr of Array.from(el.attributes)) {
      if (!keep.includes(attr.name.toLowerCase())) el.removeAttribute(attr.name)
    }

    if (tag === 'a') {
      if (!el.hasAttribute('href')) {
        unwrap(el)
        bump(issues.unwrappedLinks, 'no href')
        continue
      }
      const result = resolveHref(el.getAttribute('href'), ctx, base, issues)
      if (result.unwrap) {
        bump(issues.unwrappedLinks, result.unwrap)
        unwrap(el)
        continue
      }
      el.setAttribute('href', result.href)
      // `<a> Australia</a>` -> ` <a>Australia</a>`, so `tidy()` can trim it at a block edge.
      const first = el.firstChild
      const last = el.lastChild
      if (first?.nodeType === 3 && /^\s/.test(first.data)) {
        first.data = first.data.replace(/^\s+/, '')
        el.before(' ')
      }
      if (last?.nodeType === 3 && /\s$/.test(last.data)) {
        last.data = last.data.replace(/\s+$/, '')
        el.after(' ')
      }
      if (result.href.startsWith('http') && !result.internal) el.setAttribute('rel', 'noopener')
    }

    if (tag === 'img') {
      const rawSrc = el.getAttribute('src') || ''
      const mapped = mapMediaUrl(rawSrc)
      const external = mapped ? null : mapExternalMedia(rawSrc, ctx, issues)
      if (mapped) {
        const resolved = resolveMedia(mapped, ctx, issues)
        if (!resolved) {
          el.remove() // reported through `mediaRefs`
          continue
        }
        el.setAttribute('src', resolved)
      } else if (external) el.setAttribute('src', external)
      else if (/^https:\/\//i.test(rawSrc.trim())) el.setAttribute('src', rawSrc.trim())
      else {
        issues.droppedImages.push(rawSrc || '(no src)')
        el.remove()
        continue
      }
      if (!el.hasAttribute('alt')) el.setAttribute('alt', '')
    }
  }
}

const isBlank = (text) => /^[\s ]*$/.test(text)

/** Whitespace and empty-paragraph clean-up after the allowlist pass. */
function tidy(doc) {
  doc.body.normalize() // unwrapping leaves adjacent text nodes: "in " + " Shanghai"
  const walker = doc.createTreeWalker(doc.body, 4)
  const texts = []
  while (walker.nextNode()) texts.push(walker.currentNode)
  for (const text of texts) {
    // A single NBSP can be deliberate ("SFr 200"); runs are layout spacing
    // (190007 has 1,127). Newlines and tabs are source formatting.
    text.data = text.data.replace(/[ \t\n ]* [ \t\n ]* [ \t\n ]*/g, ' ').replace(/[ \t\n]+/g, ' ')
  }

  // Wrap top-level inline runs in <p> so the body is a list of blocks.
  const body = doc.body
  let run = null
  for (const node of Array.from(body.childNodes)) {
    const block = node.nodeType === 1 && BLOCKS.has(node.localName)
    if (block) {
      run = null
      continue
    }
    if (!run) {
      if (node.nodeType === 3 && isBlank(node.data)) {
        node.remove()
        continue
      }
      run = doc.createElement('p')
      node.before(run)
    }
    run.appendChild(node)
  }

  // `text<br />&nbsp;<br />text` inside one <p> is how the 2010s editor made
  // paragraphs (204007). Two or more <br> in a row split the <p>.
  for (const p of Array.from(body.querySelectorAll('p'))) splitOnDoubleBr(doc, p)

  // Leading/trailing <br> and whitespace inside blocks, then empty blocks.
  for (const block of Array.from(body.querySelectorAll('p,li,td,th,h2,h3,h4,blockquote,figcaption'))) {
    for (const edge of ['firstChild', 'lastChild']) {
      let node = block[edge]
      while (node && ((node.nodeType === 3 && isBlank(node.data)) || (node.nodeType === 1 && node.localName === 'br'))) {
        node.remove()
        node = block[edge]
      }
    }
    if (block.firstChild?.nodeType === 3) block.firstChild.data = block.firstChild.data.replace(/^[  ]+/, '')
    if (block.lastChild?.nodeType === 3) block.lastChild.data = block.lastChild.data.replace(/[  ]+$/, '')
  }
  for (const el of Array.from(body.querySelectorAll('strong,em,u,sup,sub'))) {
    if (isBlank(el.textContent) && !el.querySelector('img,br')) el.replaceWith(el.textContent ? ' ' : '')
  }
  for (const el of Array.from(body.querySelectorAll('p,h2,h3,h4,blockquote'))) {
    if (isBlank(el.textContent) && !el.querySelector('img,iframe,hr')) el.remove()
  }
}

function splitOnDoubleBr(doc, p) {
  const nodes = Array.from(p.childNodes)
  const segments = [[]]
  for (let index = 0; index < nodes.length; index++) {
    const node = nodes[index]
    if (node.nodeType === 1 && node.localName === 'br') {
      let end = index + 1
      let brs = 1
      while (end < nodes.length) {
        const next = nodes[end]
        if (next.nodeType === 1 && next.localName === 'br') brs++
        else if (!(next.nodeType === 3 && isBlank(next.data))) break
        end++
      }
      if (brs >= 2) {
        segments.push([])
        index = end - 1
        continue
      }
    }
    segments.at(-1).push(node)
  }
  if (segments.length < 2) return
  for (const segment of segments) {
    if (!segment.length) continue
    const next = doc.createElement('p')
    next.append(...segment)
    p.before(next)
  }
  p.remove()
}

/** One top-level block per line, for readable diffs. */
function serialise(doc) {
  return Array.from(doc.body.childNodes)
    .map((node) => (node.nodeType === 1 ? node.outerHTML : node.textContent.trim()))
    .filter(Boolean)
    .join('\n')
}

function htmlToText(html) {
  if (!html) return ''
  return collapse(parseDocument(html).body.textContent || '')
}

/* -------------------------------------------------------------------------- */
/* Row -> record                                                              */
/* -------------------------------------------------------------------------- */

/** `,,,,,Compliance,,,,,Compliance` -> ['Compliance']. Plain text first, then split. */
function splitList(value) {
  const s = plainText(value)
  if (!s) return []
  return [...new Set(s.split(',').map((part) => collapse(part)).filter(Boolean))]
}

/**
 * Plain-text record fields and the columns they come from, for the report:
 * which of them held markup in the source. `bodyHtml` and the `EVENT_HTML`
 * fields are HTML and sanitised instead.
 */
const TEXT_SOURCES = {
  title: ['title'],
  standfirst: ['summary'],
  'author.name': ['author_name'],
  'author.location': ['author_location'],
  'author.jobTitle': ['author_job_title'],
  'author.company': ['author_company'],
  'taxonomy.categories': ['article_category', 'article_secondary_category', 'article_third_category', 'article_forth_category'],
  'taxonomy.keywords': ['article_keywords'],
  'taxonomy.company': ['article_company'],
  'taxonomy.region': ['article_region'],
  'taxonomy.country': ['article_country'],
  'taxonomy.wealthCareers': ['article_wealth_careers'],
  'taxonomy.cm': ['article_category_cm', 'article_category_cm_2', 'article_category_cm_3', 'article_announcements_cm', 'article_industryviews_cm'],
  'media.videoId': ['article_video_id'],
  ...Object.fromEntries(Object.entries(EVENT_TEXT).map(([column, key]) => [`event.${key}`, [column]])),
}

/**
 * `article_video_id` is the Vimeo id the live template plays above the body
 * (196187: `data-vid_id="766064013"`). Digits only, a leading `/` forgiven
 * ('/818296087'); anything else is null and reported (190961 held a
 * doubleclick tracking pixel). When the body already embeds the same video
 * (63 rows) the id is dropped so the page never shows it twice.
 */
function videoIdOf(value, bodyHtml) {
  const s = str(value)
  if (!s) return { videoId: null }
  const id = s.replace(/^\//, '')
  if (!/^\d+$/.test(id)) return { videoId: null, invalid: s }
  if (new RegExp(`player\\.vimeo\\.com/video/${id}(?!\\d)`).test(bodyHtml)) return { videoId: null, inBody: true }
  return { videoId: id }
}

/** Windows Media streams from 2007-08 (`mms://`, `/podcast/*.wmv`): dead, kept under `legacy.media` only. */
const DEAD_STREAM = /^mms:\/\/|^https?:\/\/(?:www\.)?wealthbriefing\.com\/podcast\//i

/** Markup that is a payload, not formatting: reported with its value. */
const INJECTED = /<\s*(?:script|object|embed|svg|link|meta)\b/i

/** `llllllllll` (3 rows): one character repeated. */
const JUNK_TERM = /^(.)\1{3,}$/

/**
 * Real standfirst, or null. The 2005-2006 rows carry a 143-char auto excerpt
 * ending in `...` that is just the start of the body (7 of 107).
 */
function standfirstOf(summary, bodyText) {
  const text = plainText(summary)
  if (!text) return { standfirst: null, kind: 'empty' }
  const excerpt = /(?:\.\.\.|…)$/.exec(text)
  if (excerpt) {
    const head = text.slice(0, -excerpt[0].length).trim()
    if (head && bodyText.startsWith(head)) return { standfirst: null, kind: 'autoExcerpt' }
    return { standfirst: text, kind: 'ellipsisNotPrefix' }
  }
  return { standfirst: text, kind: 'real' }
}

function hasMojibake(value) {
  if (typeof value === 'string') return MOJIBAKE.test(value)
  if (Array.isArray(value)) return value.some(hasMojibake)
  if (value && typeof value === 'object') return Object.values(value).some(hasMojibake)
  return false
}

/**
 * One `cms_articles` row -> archive record, or null when not published.
 *
 * Deterministic given `row` and `ctx`. When `ctx.report` is an accumulator
 * from `createReport()`, everything dropped or rewritten is recorded there;
 * otherwise nothing outside the return value is touched.
 */
export function normalizeRow(input, ctx) {
  if (str(input.is_published) !== '1') return null
  const lost = lostStats()
  const row = repairRow(input, lost)
  const id = Number(row.article_id)
  const pub = resolvePublications(row)
  const base = LEGACY_BASE[pub.publications[0]]
  const issues = emptyIssues()

  const { title, missing: titleMissing } = titleOf(row, pub.types)
  const bodyHtml = cleanHtml(row.body, ctx, base, issues)
  const bodyText = htmlToText(bodyHtml)
  const { standfirst, kind: standfirstKind } = standfirstOf(row.summary, bodyText)
  const articleDate = mysqlDate(row.article_date)

  const categories = []
  const junkTerms = []
  for (const column of ['article_category', 'article_secondary_category', 'article_third_category', 'article_forth_category']) {
    const value = plainText(row[column])
    if (!value) continue
    if (JUNK_TERM.test(value)) junkTerms.push(value)
    else if (!categories.includes(value)) categories.push(value)
  }

  const isEventType = [row.article_type, row.wb_article_type, row.wba_article_type, row.fwr_article_type, row.cm_article_type]
    .map(str)
    .some((type) => type && /^event/i.test(type))
  const event = {}
  for (const [column, key] of Object.entries(EVENT_TEXT)) event[key] = plainText(row[column])
  for (const [column, key] of Object.entries(EVENT_HTML)) {
    event[key] = str(row[column]) ? cleanHtml(row[column], ctx, base, issues) || null : null
  }
  event.endDate = mysqlDate(row.article_end_date)
  event.image = mediaField(row.eventimage, ctx, issues)
  event.imageUrl = mediaField(row.eventimageurl, ctx, issues)
  const hasEvent = isEventType || Object.values(event).some((value) => value !== null)

  const filename = str(row.filename)
  const video = videoIdOf(row.article_video_id, bodyHtml)
  const streams = { video: raw(row.article_video), videoFile: str(row.article_video_file), audio: raw(row.article_audio), audioFile: str(row.article_audio_file) }
  const deadStreams = {}
  for (const [key, value] of Object.entries(streams)) {
    if (value && DEAD_STREAM.test(value)) {
      deadStreams[key] = value
      streams[key] = null
    }
  }
  // An image that is not ours: an http(s) URL stays (listed in the report,
  // mostly clearviewpublishing.com/wp-content), anything else (a caption, a
  // bare number) is not an image at all.
  let image = mediaField(row.article_image, ctx, issues)
  let imageKind = image === null ? null : image.startsWith(ARCHIVE_MEDIA_PREFIX) ? 'archive' : 'external'
  if (imageKind === 'external' && !/^https?:\/\/[^\s<>"]+$/i.test(image)) {
    imageKind = 'junk'
    issues.junkImage = image
    image = null
  }
  const record = {
    id,
    slug: archiveSlug(title),
    title,
    standfirst,
    bodyHtml,
    date: articleDate ? articleDate.slice(0, 10) : null,
    publications: pub.publications,
    types: pub.types,
    // Display field: `name` only. jobTitle and company are stored, never rendered (README section 4).
    author: {
      name: plainText(row.author_name),
      location: plainText(row.author_location),
      jobTitle: plainText(row.author_job_title),
      company: plainText(row.author_company),
      image: mediaField(row.author_image, ctx, issues),
      imageDisplay: raw(row.author_image_display),
      id: str(row.author_id) && str(row.author_id) !== '0' ? Number(row.author_id) : null,
    },
    taxonomy: {
      categories,
      keywords: splitList(row.article_keywords),
      company: plainText(row.article_company),
      region: plainText(row.article_region),
      country: plainText(row.article_country),
      wealthCareers: plainText(row.article_wealth_careers),
      cm: {
        category: plainText(row.article_category_cm),
        category2: plainText(row.article_category_cm_2),
        category3: plainText(row.article_category_cm_3),
        announcements: plainText(row.article_announcements_cm),
        industryViews: plainText(row.article_industryviews_cm),
      },
    },
    media: {
      image,
      imageSponsored: mediaField(row.article_image_sponsored, ctx, issues),
      videoId: video.videoId,
      ...streams,
      attachment: filename
        ? {
            filename,
            filetype: str(row.filetype),
            filesize: str(row.filesize) ? Number(row.filesize) : null,
            path: attachmentPath(row.article_id, filename, ctx, issues),
          }
        : null,
    },
    event: hasEvent ? event : null,
    legacy: {
      articleType: str(row.article_type),
      articleTypeSec: str(row.article_type_sec),
      wbType: str(row.wb_article_type),
      wbaType: str(row.wba_article_type),
      fwrType: str(row.fwr_article_type),
      cmType: str(row.cm_article_type),
      // Pre-merge per-brand type columns, empty on ~all rows.
      articleTypeWba: str(row.article_type_wba),
      articleTypeFwr: str(row.article_type_fwr),
      articleTypeCm: str(row.article_type_cm),
      sitePublish: {
        wb: bitFlag(row.wb_site_publish),
        wba: bitFlag(row.wba_site_publish),
        fwr: bitFlag(row.fwr_site_publish),
        iwr: bitFlag(row.iwr_site_publish),
        wtb: bitFlag(row.wtb_site_publish),
      },
      // `article_fwr_only` defaults to 'Y' and means nothing.
      only: {
        wba: ynFlag(row.article_wba_only),
        iwr: ynFlag(row.article_iwr_only),
        cm: ynFlag(row.article_cm_only),
        fwr: ynFlag(row.article_fwr_only),
      },
      datePublished: mysqlDate(row.date_published),
      dateSubmitted: mysqlDate(row.date_submitted),
      free: raw(row.article_free),
      premium: raw(row.article_premium),
      exclusive: raw(row.article_exclusive),
      research: raw(row.article_research),
      excludeFromSearch: bitFlag(row.exclude_from_search),
      extraBrands: pub.extraBrands,
      // Only present when true: `title` is a type label or "Untitled".
      ...(titleMissing ? { titleMissing: true } : {}),
    },
  }

  if (Object.keys(deadStreams).length) record.legacy.media = deadStreams

  const report = ctx.report
  if (report) {
    report.rowsOut++
    bump(report.publications, pub.publications.join('+'))
    if (pub.defaulted) report.defaultedBrand.push(id)
    for (const brand of pub.extraBrands) bump(report.extraBrands, brand)
    bump(report.standfirst, standfirstKind)
    if (standfirstKind === 'ellipsisNotPrefix') report.standfirstEllipsisNotPrefix.push(id)
    if (!record.date) report.datesNull.push(id)
    if (titleMissing) report.emptyTitle.push(id)
    if (!bodyText && !record.media.videoId) report.emptyBody.push(id)
    if (pub.era === 2 && (record.legacy.sitePublish.fwr || record.legacy.sitePublish.iwr || record.legacy.sitePublish.wtb || record.legacy.only.wba)) {
      report.era2LegacyFlagsIgnored.push(id)
    }
    if (hasEvent) report.events.push(id)
    if (junkTerms.length) report.junkCategories.push({ id, values: junkTerms })
    for (const src of issues.droppedIframes) report.droppedIframes.push({ id, src })
    for (const src of issues.droppedImages) report.droppedImages.push({ id, src })
    for (const href of issues.unresolvedLinks) report.unresolvedLinks.push({ id, href })
    for (const href of issues.mailtoFixed) report.mailtoFixed.push({ id, href })
    for (const target of issues.idLinksOutsideRun) report.idLinksOutsideRun.push({ id, target })
    for (const [tag, n] of Object.entries(issues.droppedElements)) bump(report.droppedElements, tag, n)
    for (const [tag, n] of Object.entries(issues.unwrapped)) bump(report.unwrapped, tag, n)
    for (const [reason, n] of Object.entries(issues.unwrappedLinks)) bump(report.unwrappedLinks, reason, n)
    for (const [host, n] of Object.entries(issues.keptIframes)) bump(report.keptIframes, host, n)
    for (const [kind, n] of Object.entries(issues.keywordLinks)) bump(report.keywordLinks, kind, n)
    report.shortcodes += issues.shortcodes
    report.externalMapped += issues.externalMapped
    if (video.invalid) report.videoIdInvalid.push({ id, value: video.invalid })
    if (video.inBody) report.videoIdInBody.push(id)
    for (const key of Object.keys(deadStreams)) bump(report.deadStreams, key)
    if (imageKind === 'external') {
      report.externalImages.push({ id, url: record.media.image })
      bump(report.externalImageHosts, new URL(record.media.image).hostname)
    }
    if (imageKind === 'junk') report.junkImages.push({ id, value: issues.junkImage })
    for (const href of issues.keywordBroken) report.keywordBroken.push({ id, href })
    for (const [field, columns] of Object.entries(TEXT_SOURCES)) {
      for (const column of columns) {
        const value = str(row[column])
        if (!value || !/[<>]/.test(value)) continue
        bump(report.textMarkup, field)
        if (INJECTED.test(value)) report.injectedMarkup.push({ id, field, value })
      }
    }
    for (const item of issues.droppedMediaValues) report.droppedMediaValues.push({ id, ...item })
    for (const ref of issues.mediaRefs) {
      if (!report.mediaRefs[ref.rel]) report.mediaRefs[ref.rel] = { how: ref.how, disk: ref.disk }
      if (!ref.disk) report.mediaMissing.push({ id, path: ref.rel })
    }
    if (lost.mojibake) report.mojibakeRepaired.push(id)
    if (Object.keys(lost.rules).length) report.lostCharsRestored.push(id)
    for (const [rule, n] of Object.entries(lost.rules)) bump(report.lostChars, rule, n)
    for (const context of lost.leftover) report.lostCharsLeft.push({ id, context })
    if (issues.escapedMarkup) report.escapedMarkup.push(id)
    if (hasMojibake(record)) report.mojibake.push(id)
  }
  return record
}

/* -------------------------------------------------------------------------- */
/* Input                                                                      */
/* -------------------------------------------------------------------------- */

/** phpMyAdmin JSON export -> rows. Also accepts a bare array of row objects. */
export function readExport(path) {
  const parsed = JSON.parse(readFileSync(path, 'utf8'))
  if (!Array.isArray(parsed)) throw new Error(`${path}: expected a JSON array`)
  const table = parsed.find((item) => item && item.type === 'table')
  if (table) return table.data || []
  return parsed.filter((item) => item && item.article_id !== undefined)
}

/** Merge exports by `article_id`, later files adding or overriding columns. */
export function mergeRows(lists) {
  const byId = new Map()
  for (const rows of lists) {
    for (const row of rows) {
      const key = String(row.article_id)
      byId.set(key, { ...(byId.get(key) || {}), ...row })
    }
  }
  return [...byId.values()].sort((a, b) => Number(a.article_id) - Number(b.article_id))
}

/* -------------------------------------------------------------------------- */
/* CLI                                                                        */
/* -------------------------------------------------------------------------- */

export function createReport() {
  return {
    rowsIn: 0,
    rowsOut: 0,
    unpublishedSkipped: [],
    publications: {},
    defaultedBrand: [],
    extraBrands: {},
    standfirst: {},
    standfirstEllipsisNotPrefix: [],
    datesNull: [],
    emptyTitle: [],
    emptyBody: [],
    era2LegacyFlagsIgnored: [],
    events: [],
    junkCategories: [],
    keptIframes: {},
    keywordLinks: {},
    shortcodes: 0,
    keywordBroken: [],
    videoIdInvalid: [],
    videoIdInBody: [],
    deadStreams: {},
    externalMapped: 0,
    externalImageHosts: {},
    externalImages: [],
    junkImages: [],
    textMarkup: {},
    injectedMarkup: [],
    droppedMediaValues: [],
    droppedIframes: [],
    droppedImages: [],
    droppedElements: {},
    unwrapped: {},
    unwrappedLinks: {},
    unresolvedLinks: [],
    idLinksOutsideRun: [],
    mailtoFixed: [],
    unmappedColumns: [],
    omittedColumnsSeen: [],
    mojibakeRepaired: [],
    lostChars: {},
    lostCharsRestored: [],
    lostCharsLeft: [],
    escapedMarkup: [],
    mojibake: [],
    // Filled by `--media`: per distinct path the first lookup, then `finishMedia()` summarises.
    mediaRefs: {},
    mediaMissing: [],
    media: null,
  }
}

/**
 * Add one chunk's report to the run's. Chunks merge in row order, so lists
 * stay sorted by id and counter keys keep first-seen order: the result is the
 * same as one report filled row by row.
 */
function mergeReport(into, part) {
  for (const [key, value] of Object.entries(part)) {
    if (typeof value === 'number') into[key] += value
    else if (Array.isArray(value)) for (const item of value) into[key].push(item)
    else if (value && typeof value === 'object') {
      for (const [inner, v] of Object.entries(value)) {
        if (typeof v === 'number') bump(into[key], inner, v)
        else if (!(inner in into[key])) into[key][inner] = v
      }
    }
  }
}

/** `mediaRefs` -> counts per distinct legacy path and the upload manifest. */
function finishMedia(report) {
  const refs = Object.entries(report.mediaRefs).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
  const manifest = [...new Set(refs.map(([, ref]) => ref.disk).filter(Boolean))].sort()
  const counts = { distinct: refs.length, exact: 0, caseFixed: 0, viaZa: 0, missing: 0, manifest: manifest.length }
  for (const [, ref] of refs) counts[ref.how]++
  report.media = counts
  report.mediaCaseFixed = refs.filter(([, ref]) => ref.how === 'caseFixed').map(([rel, ref]) => ({ from: rel, to: ref.disk }))
  report.mediaViaZa = refs.filter(([, ref]) => ref.how === 'viaZa').map(([rel]) => rel)
  delete report.mediaRefs
  return manifest
}

function parseArgs(args) {
  const parsed = { inputs: [], out: null, report: false, media: null, workers: Math.max(1, availableParallelism() - 1) }
  for (let index = 0; index < args.length; index++) {
    const arg = args[index]
    if (arg === '--in') parsed.inputs.push(args[++index])
    else if (arg === '--out') parsed.out = args[++index] ?? null
    else if (arg === '--report') parsed.report = true
    else if (arg === '--media') parsed.media = args[++index] ?? null
    else if (arg === '--workers') parsed.workers = Number(args[++index])
    else throw new Error(`unknown argument ${arg}`)
  }
  if (!parsed.inputs.length || parsed.inputs.some((input) => !input)) throw new Error('--in <file> is required')
  if (!parsed.out) throw new Error('--out <dir> is required')
  if (!Number.isInteger(parsed.workers) || parsed.workers < 1) throw new Error('--workers takes a positive integer')
  if (args.includes('--media') && !parsed.media) throw new Error('--media <dir> needs a directory')
  return parsed
}

const expandHome = (path) => (path.startsWith('~/') ? join(homedir(), path.slice(2)) : path)

/** Columns that carry a value in any row but that nobody maps or omits. */
function columnCheck(rows, report) {
  const seen = new Set()
  for (const row of rows) {
    for (const [column, value] of Object.entries(row)) {
      const s = str(value)
      if (s && s !== '0' && !/^0000-00-00/.test(s)) seen.add(column)
    }
  }
  for (const column of [...seen].sort()) {
    if (MAPPED_COLUMNS.has(column)) continue
    if (isOmittedColumn(column)) report.omittedColumnsSeen.push(column)
    else report.unmappedColumns.push(column)
  }
}

function summary(report, outDir) {
  const ids = (list) => (list.length ? list.map((item) => (typeof item === 'object' ? item.id : item)).join(', ') : '-')
  const pairs = (map) =>
    Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .map(([key, n]) => `${key} ${n}`)
      .join(', ') || '-'
  const media = report.media
  const lines = [
    `rows in ${report.rowsIn}, out ${report.rowsOut}, unpublished skipped ${report.unpublishedSkipped.length}`,
    `publications: ${pairs(report.publications)}`,
    `defaultedBrand (${report.defaultedBrand.length}): ${ids(report.defaultedBrand)}`,
    `extraBrands: ${pairs(report.extraBrands)}`,
    `standfirst: ${pairs(report.standfirst)}`,
    `dates null (${report.datesNull.length}): ${ids(report.datesNull)}`,
    `events (${report.events.length}): ${ids(report.events)}`,
    `iframes kept: ${pairs(report.keptIframes)}; dropped ${report.droppedIframes.length}: ${ids(report.droppedIframes)}`,
    `images dropped ${report.droppedImages.length}: ${ids(report.droppedImages)}`,
    `elements dropped: ${pairs(report.droppedElements)}`,
    `elements unwrapped: ${pairs(report.unwrapped)}`,
    `keyword links to /search: ${pairs(report.keywordLinks)} (shortcodes ${report.shortcodes})`,
    `keyword links unwrapped, keyword unreadable: ${ids(report.keywordBroken)}`,
    `links unwrapped: ${pairs(report.unwrappedLinks)}`,
    `text fields that held markup: ${pairs(report.textMarkup)}`,
    `injected markup dropped (${report.injectedMarkup.length}): ${report.injectedMarkup.map((item) => `${item.id} ${item.field}`).join(', ') || '-'}`,
    `media values with markup dropped: ${ids(report.droppedMediaValues)}`,
    `videoId invalid, dropped: ${ids(report.videoIdInvalid)}; already embedded in body, dropped: ${report.videoIdInBody.length}`,
    `dead Windows Media streams moved to legacy.media: ${pairs(report.deadStreams)}`,
    `external media.image (${report.externalImages.length}): ${pairs(report.externalImageHosts)}; junk media.image dropped: ${ids(report.junkImages)}`,
    `links unresolved, unwrapped (${report.unresolvedLinks.length}): ${ids(report.unresolvedLinks)}`,
    `id links to articles outside this run, unwrapped: ${report.idLinksOutsideRun.length}`,
    `http email links fixed to mailto: ${ids(report.mailtoFixed)}`,
    `junk categories dropped: ${ids(report.junkCategories)}`,
    `era-2 rows with legacy flags ignored: ${ids(report.era2LegacyFlagsIgnored)}`,
    `empty body: ${ids(report.emptyBody)}, empty title: ${ids(report.emptyTitle)}`,
    `unmapped columns: ${report.unmappedColumns.join(', ') || 'none'}`,
    `mojibake repaired (${report.mojibakeRepaired.length}): ${ids(report.mojibakeRepaired)}`,
    `lost characters restored: ${pairs(report.lostChars)} in ${report.lostCharsRestored.length} records; left: ${report.lostCharsLeft.map((item) => `${item.id} "${item.context}"`).join('; ') || '-'}`,
    `bodies with escaped or spaced ("< b>") markup decoded: ${ids(report.escapedMarkup)}`,
    `mojibake still flagged (${report.mojibake.length}): ${ids(report.mojibake)}`,
    media
      ? `media: mirrored clearviewpublishing.com uploads mapped ${report.externalMapped}; ${media.distinct} paths, exact ${media.exact}, case fixed ${media.caseFixed}, via za/ ${media.viaZa}, missing ${media.missing} (${report.mediaMissing.length} references), manifest ${media.manifest}`
      : 'media: not checked (no --media)',
    `report: ${join(outDir, '_report.json')}`,
  ]
  console.log(lines.join('\n'))
}

/** Normalise and write one chunk of rows; returns the chunk's report. */
function processChunk(rows, ctx, outDir) {
  // A fresh window per chunk. Parse cost grows with every document the
  // shared one has made (3.5 ms a row over 6k rows, 11 ms over 18k).
  sharedParser = null
  const report = createReport()
  const chunkCtx = { ...ctx, report }
  for (const row of rows) {
    const record = normalizeRow(row, chunkCtx)
    if (!record) {
      report.unpublishedSkipped.push(Number(row.article_id))
      continue
    }
    writeFileSync(join(outDir, `${record.id}.json`), `${JSON.stringify(record, null, 2)}\n`, 'utf8')
  }
  return report
}

const CHUNK_ROWS = 200

/**
 * Chunks out to `workers` threads, reports back in chunk order. Each worker
 * gets the context once (structured clone copies the Maps) and writes its own
 * files, so only rows and reports cross threads.
 */
function runChunks(chunks, ctx, outDir, workers) {
  const reports = new Array(chunks.length)
  if (workers === 1) {
    chunks.forEach((chunk, index) => (reports[index] = processChunk(chunk, ctx, outDir)))
    return Promise.resolve(reports)
  }
  const shared = {
    slugById: ctx.slugById,
    legacySlugIndex: ctx.legacySlugIndex,
    media: ctx.media,
  }
  return new Promise((done, fail) => {
    let next = 0
    let finished = 0
    const pool = []
    const feed = (worker) => {
      if (next < chunks.length) {
        worker.postMessage({ index: next, rows: chunks[next] })
        next++
      }
    }
    for (let n = 0; n < Math.min(workers, chunks.length); n++) {
      const worker = new Worker(new URL(import.meta.url), { workerData: { normalizeWorker: true, ctx: shared, outDir } })
      worker.on('message', ({ index, report }) => {
        reports[index] = report
        finished++
        if (finished === chunks.length) {
          for (const each of pool) each.terminate()
          done(reports)
        } else feed(worker)
      })
      worker.on('error', (error) => {
        for (const each of pool) each.terminate()
        fail(error)
      })
      pool.push(worker)
      feed(worker)
    }
    if (!chunks.length) done(reports)
  })
}

function runWorker() {
  const { ctx, outDir } = workerData
  parentPort.on('message', ({ index, rows }) => {
    parentPort.postMessage({ index, report: processChunk(rows, ctx, outDir) })
  })
}

async function main(argv) {
  const started = Date.now()
  const { inputs, out, report: wantReport, media, workers } = parseArgs(argv.slice(2))
  const outDir = resolve(expandHome(out))
  const rows = mergeRows(inputs.map((input) => readExport(resolve(expandHome(input)))))
  const ctx = buildContext(rows)
  if (media) ctx.media = buildMediaIndex(resolve(expandHome(media)))
  const report = createReport()
  report.rowsIn = rows.length

  mkdirSync(outDir, { recursive: true })
  const chunks = []
  for (let index = 0; index < rows.length; index += CHUNK_ROWS) chunks.push(rows.slice(index, index + CHUNK_ROWS))
  for (const part of await runChunks(chunks, ctx, outDir, workers)) mergeReport(report, part)

  columnCheck(rows, report)
  if (ctx.media) {
    const manifest = finishMedia(report)
    writeFileSync(join(outDir, '_media.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8')
  } else delete report.mediaRefs
  const seconds = ((Date.now() - started) / 1000).toFixed(1)
  if (wantReport) {
    writeFileSync(join(outDir, '_report.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8')
    summary(report, outDir)
  } else {
    console.log(`${report.rowsOut} records written to ${outDir}`)
  }
  console.log(`${workers} worker${workers === 1 ? '' : 's'}, ${seconds} s`)
}

if (!isMainThread && workerData?.normalizeWorker) runWorker()

const invokedDirectly = isMainThread && process.argv[1] && process.argv[1].endsWith('normalize.mjs')
if (invokedDirectly) {
  main(process.argv).catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
}
