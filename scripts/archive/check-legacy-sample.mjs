#!/usr/bin/env node
/**
 * Compares a small sample of the archive with the live legacy sites. It is the
 * only check that can catch a parser error (lost or cut text, wrong date,
 * wrong author, lost video) or a redirect that points at the wrong article,
 * because every other check reads our own data.
 *
 *   node scripts/archive/check-legacy-sample.mjs [options]
 *
 *   --records <dir>    default ~/wb-archive-data/records-v8
 *   --map <csv>        default ~/wb-archive-data/redirects/redirects.csv
 *   --content <n>      articles to compare by content, default 150
 *   --redirects <n>    redirect rows to compare by title, default 150 (a third per method)
 *   --delay <ms>       pause between requests, default 6000
 *   --out <dir>        default ~/wb-archive-data/legacy-sample (pages are cached there)
 *
 * Gentle on the legacy servers: one request at a time, a pause between
 * requests, the migration User-Agent, `www` hosts (the apex redirect
 * percent-decodes the path), a cache so a re-run fetches nothing twice. After
 * a 5xx or an empty body it waits 90 s and tries once more; three failures in
 * a row stop the run.
 *
 * Content: the article on its first publication's domain at
 * `article.php/x?id=N`, which renders the full body. Title, date, author and
 * video id must match; the body text must overlap the legacy text both ways
 * (5-word shingles, at least 90%).
 *
 * Redirects: the legacy URL, fetched as is. Its article's title must be our
 * target's title. For `slug-latest` rows legacy serves the oldest edition of
 * the shared address, so the title must match and our target must be the
 * same date or later.
 *
 * The sample is fixed (spread evenly over ids and rows), so runs compare.
 */

import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

const args = process.argv.slice(2)
const option = (name, fallback) => {
  const index = args.indexOf(`--${name}`)

  return index >= 0 && args[index + 1] ? args[index + 1] : fallback
}
const home = (value) => value.replace(/^~(?=\/)/, homedir())

const recordsDir = home(option('records', '~/wb-archive-data/records-v8'))
const mapFile = home(option('map', '~/wb-archive-data/redirects/redirects.csv'))
const contentCount = Number(option('content', '150'))
const redirectCount = Number(option('redirects', '150'))
const delay = Number(option('delay', '6000'))
const outDir = home(option('out', '~/wb-archive-data/legacy-sample'))
const cacheDir = join(outDir, 'pages')

mkdirSync(cacheDir, { recursive: true })

const UA = 'FocusReactive-migration-baseline/1.0 (+contracted developer, ClearView Financial Media)'
const DOMAINS = {
  wealthbriefing: 'https://www.wealthbriefing.com/html/article.php',
  wealthbriefingasia: 'https://www.wealthbriefingasia.com/article.php',
  familywealthreport: 'https://www.familywealthreport.com/article.php',
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
const record = (id) => {
  const file = join(recordsDir, `${id}.json`)

  return existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : null
}

/** Every n-th of `items`, `count` of them, from the first to the last. */
const spread = (items, count) =>
  items.length <= count
    ? items
    : Array.from({ length: count }, (_, i) => items[count === 1 ? 0 : Math.floor((i * (items.length - 1)) / (count - 1))])

let consecutiveFailures = 0
let fetched = 0

async function page(url) {
  const file = join(cacheDir, `${Buffer.from(url).toString('base64url').slice(0, 200)}.html`)

  if (existsSync(file)) {
    return readFileSync(file, 'utf8')
  }

  for (let attempt = 0; attempt < 2; attempt++) {
    if (fetched > 0) await sleep(attempt ? 90_000 : delay)
    fetched++

    try {
      const response = await fetch(url, { headers: { 'user-agent': UA }, redirect: 'follow' })
      const html = await response.text()

      if (response.ok && html.length > 1000) {
        consecutiveFailures = 0
        writeFileSync(file, html)
        return html
      }

      console.warn(`  ${response.status} (${html.length} bytes) ${url}`)
    } catch (error) {
      console.warn(`  ${error.message} ${url}`)
    }
  }

  if (++consecutiveFailures >= 3) {
    console.error('Three failures in a row: stopping so the legacy server is left alone.')
    finish()
    process.exit(2)
  }

  return null
}

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', ndash: '–', mdash: '—', rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“', hellip: '…', pound: '£', euro: '€' }
const decode = (text) =>
  text
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&([a-z]+);/gi, (match, name) => ENTITIES[name.toLowerCase()] ?? match)
const text = (html) => decode(html.replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, ' ').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim()
const key = (value) => (value ?? '').normalize('NFKD').toLowerCase().replace(/[^a-z0-9]+/g, '')
const words = (value) => (value ?? '').normalize('NFKD').toLowerCase().match(/[a-z0-9]+/g) ?? []

function shingles(list) {
  const set = new Set()

  for (let i = 0; i + 5 <= list.length; i++) set.add(list.slice(i, i + 5).join(' '))
  return set
}

/** Share of `a`'s shingles found in `b`, or null when `a` has none. */
function overlap(a, b) {
  if (a.size === 0) return null
  let hit = 0

  for (const item of a) if (b.has(item)) hit++
  return hit / a.size
}

const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december']

/** The legacy page's article: h1, meta line and body. */
function legacyArticle(html) {
  const h1 = /<header[\s\S]*?<h1[^>]*>([\s\S]*?)<\/h1>/i.exec(html)?.[1] ?? /<h1[^>]*>([\s\S]*?)<\/h1>/i.exec(html)?.[1]
  const meta = (name) => text(new RegExp(`<span class="meta-item ${name}">([\\s\\S]*?)</span>`, 'i').exec(html)?.[1] ?? '')
  const dateText = meta('date').toLowerCase()
  // "28 november 2021" (WealthBriefing, WealthBriefingAsia) or "january 3, 2014" (Family Wealth Report).
  const dayFirst = /^(\d{1,2})\s+([a-z]+)\s+(\d{4})$/.exec(dateText)
  const monthFirst = /^([a-z]+)\s+(\d{1,2}),?\s+(\d{4})$/.exec(dateText)
  const date = dayFirst ?? (monthFirst && [monthFirst[0], monthFirst[2], monthFirst[1], monthFirst[3]])
  const start = html.indexOf('class="article-content"')
  const end = start >= 0 ? html.indexOf('</article>', start) : -1
  let body = start >= 0 && end > start ? html.slice(start, end) : ''
  const videoId = /data-vid_id="(\d+)"/.exec(body)?.[1] ?? null

  body = body
    .replace(/<div class="video-img">[\s\S]*?<div class="vid_duration">[\s\S]*?<\/div>\s*<\/div>/i, ' ')
    .replace(/<p class="standfirst">[\s\S]*?<\/p>/i, ' ')

  return {
    title: h1 ? text(h1) : null,
    author: meta('author') || null,
    date: date && MONTHS.includes(date[2]) ? `${date[3]}-${String(MONTHS.indexOf(date[2]) + 1).padStart(2, '0')}-${date[1].padStart(2, '0')}` : null,
    rawDate: dateText,
    videoId,
    body: text(body),
  }
}

const results = { content: [], redirects: [] }
const mismatches = []

function finish() {
  const summary = (rows) => {
    const counts = {}

    for (const row of rows) for (const issue of row.issues) counts[issue] = (counts[issue] ?? 0) + 1
    return { checked: rows.length, clean: rows.filter((row) => row.issues.length === 0).length, issues: counts }
  }
  const report = { at: new Date().toISOString(), requests: fetched, content: summary(results.content), redirects: summary(results.redirects) }
  const csv = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`

  writeFileSync(join(outDir, 'report.json'), `${JSON.stringify({ ...report, results }, null, 2)}\n`)
  writeFileSync(join(outDir, 'mismatches.csv'), ['kind,id,url,issue,ours,legacy', ...mismatches.map((m) => [m.kind, m.id, m.url, m.issue, m.ours, m.legacy].map(csv).join(','))].join('\n') + '\n')
  console.log(`\n${JSON.stringify(report, null, 2)}\nWritten ${outDir}/report.json and mismatches.csv`)
}

// Content sample: spread over ids within each first publication, in proportion to its share.
const all = []

for (const name of readdirSync(recordsDir)) {
  if (/^\d+\.json$/.test(name)) all.push(Number(name.slice(0, -5)))
}
all.sort((a, b) => a - b)

const byBrand = { wealthbriefing: [], wealthbriefingasia: [], familywealthreport: [] }

for (const id of all) byBrand[record(id).publications[0]]?.push(id)

const contentSample = Object.entries(byBrand).flatMap(([brand, list]) =>
  spread(list, Math.max(1, Math.round((contentCount * list.length) / all.length))).map((id) => ({ brand, id })),
)

// Redirect sample: a third per method, spread over the map's rows.
const rows = readFileSync(mapFile, 'utf8').trim().split('\n').slice(1).map((line) => {
  const [legacy, domain, method, id, target] = line.split(',')

  return { legacy, domain, method, id: Number(id), target }
})
const redirectSample = ['id', 'slug', 'slug-latest'].flatMap((method) =>
  spread(rows.filter((row) => row.method === method), Math.round(redirectCount / 3)),
)

console.log(`Content ${contentSample.length}, redirects ${redirectSample.length}, about ${Math.round(((contentSample.length + redirectSample.length) * delay) / 60000)} min`)

for (const [index, { brand, id }] of contentSample.entries()) {
  const ours = record(id)
  const url = `${DOMAINS[brand]}/x?id=${id}`
  const html = await page(url)
  const issues = []
  const note = (issue, a, b) => {
    issues.push(issue)
    mismatches.push({ kind: 'content', id, url, issue, ours: String(a ?? '').slice(0, 300), legacy: String(b ?? '').slice(0, 300) })
  }

  if (!html) {
    note('fetch failed')
  } else {
    const legacy = legacyArticle(html)
    const ourWords = words(text(ours.bodyHtml ?? ''))
    const theirWords = words(legacy.body)
    const oursInTheirs = overlap(shingles(ourWords), shingles(theirWords))
    const theirsInOurs = overlap(shingles(theirWords), shingles(ourWords))

    if (key(legacy.title) !== key(ours.title)) note('title', ours.title, legacy.title)
    if (legacy.date !== ours.date) note('date', ours.date, legacy.rawDate)
    if (key(legacy.author) !== key(ours.author?.name)) note('author', ours.author?.name, legacy.author)
    if (legacy.videoId && legacy.videoId !== ours.media.videoId && !(ours.bodyHtml ?? '').includes(legacy.videoId)) note('video', ours.media.videoId, legacy.videoId)
    if (theirsInOurs !== null && theirsInOurs < 0.9) note('body: legacy text missing from ours', `${Math.round(theirsInOurs * 100)}% of ${theirWords.length} words`, legacy.body.slice(0, 300))
    if (oursInTheirs !== null && oursInTheirs < 0.9) note('body: our text not on legacy', `${Math.round(oursInTheirs * 100)}% of ${ourWords.length} words`, text(ours.bodyHtml ?? '').slice(0, 300))

    results.content.push({ id, brand, url, issues, words: { ours: ourWords.length, legacy: theirWords.length }, overlap: { oursInTheirs, theirsInOurs } })
  }

  if (!html) results.content.push({ id, brand, url, issues })
  console.log(`content ${index + 1}/${contentSample.length} ${id} ${issues.join('; ') || 'ok'}`)
}

for (const [index, row] of redirectSample.entries()) {
  const target = record(/\/archive\/(\d+)\//.exec(row.target)?.[1])
  const url = row.legacy.replace(/^https:\/\/(?!www\.)/, 'https://www.')
  const html = await page(url)
  const issues = []
  const note = (issue, a, b) => {
    issues.push(issue)
    mismatches.push({ kind: `redirect ${row.method}`, id: row.id, url, issue, ours: String(a ?? '').slice(0, 300), legacy: String(b ?? '').slice(0, 300) })
  }

  if (!target) note('no target record', row.target)
  else if (!html) note('fetch failed')
  else {
    const legacy = legacyArticle(html)

    if (key(legacy.title) !== key(target.title)) note('different article', target.title, legacy.title)
    else if (row.method === 'slug-latest' && legacy.date && target.date && target.date < legacy.date) note('older than legacy edition', target.date, legacy.date)
  }

  results.redirects.push({ legacy: row.legacy, method: row.method, target: row.target, issues })
  console.log(`redirect ${index + 1}/${redirectSample.length} ${row.method} ${issues.join('; ') || 'ok'}`)
}

finish()
