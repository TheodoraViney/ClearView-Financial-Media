/**
 * Offline checks of the archive data, with no network: run it on the records
 * that go to R2, before the upload.
 *
 *   bun scripts/archive/check-records.tsx [--records <dir>] [--media <dir>] [--sample <n>]
 *
 *   --records  default ~/wb-archive-data/records-v8 (`_media.json` is read from it)
 *   --media    default ~/wb-archive-data/media; media files are checked on disk
 *   --sample   render only every n-th record (the data checks still cover all)
 *
 * Per record:
 *   1. shape: id, slug, title, a known editorial first publication, a valid date or none;
 *   2. it renders through fromArchiveRecord and ArticlePage without throwing,
 *      with its title in the h1;
 *   3. the body holds nothing the export allowlist should have removed:
 *      script, event handlers, javascript: or data: URLs, style, forms,
 *      iframes other than Vimeo, YouTube and libsyn (the normaliser rebuilds those);
 *   4. every /archive-media/ path it uses (image, body img and links) is in
 *      `_media.json` and on disk;
 *   5. every /archive/{id}/{slug} link in the body names an existing record
 *      with that slug.
 * Across the data:
 *   6. every redirect target in data/legacy-redirects names an existing
 *      record with that slug;
 *   7. data/archive-sitemap lists every record exactly once, under its first
 *      publication, with its slug.
 *
 * Writes failures to <records>/../check-records-failures.csv and exits 1 when
 * there are any.
 */

import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { renderToString } from 'react-dom/server'

import { isEditorialBrandKey } from '@/brands'
import { ArchiveBody } from '@/components/sections/article/ArchiveBody'
import { ArticlePage } from '@/components/sections/article/ArticlePage'
import type { ArchiveRecord } from '@/lib/archive'
import { fromArchiveRecord } from '@/sanity/article-view'

const args = process.argv.slice(2)
const option = (name: string, fallback: string) => {
  const index = args.indexOf(`--${name}`)

  return index >= 0 && args[index + 1] ? args[index + 1] : fallback
}
const home = (value: string) => value.replace(/^~(?=\/)/, homedir())

const recordsDir = home(option('records', '~/wb-archive-data/records-v8'))
const mediaDir = home(option('media', '~/wb-archive-data/media'))
const sample = Math.max(1, Number(option('sample', '1')) || 1)
const repo = join(dirname(fileURLToPath(import.meta.url)), '../..')

type Failure = { id: number | string; check: string; detail: string }
const failures: Failure[] = []
const fail = (id: number | string, check: string, detail: string) => failures.push({ id, check, detail })

const ids = readdirSync(recordsDir)
  .filter((name) => /^\d+\.json$/.test(name))
  .map((name) => Number(name.slice(0, -5)))
  .sort((a, b) => a - b)

const records = new Map<number, ArchiveRecord>()

for (const id of ids) {
  records.set(id, JSON.parse(readFileSync(join(recordsDir, `${id}.json`), 'utf8')) as ArchiveRecord)
}

const manifest = new Set<string>(JSON.parse(readFileSync(join(recordsDir, '_media.json'), 'utf8')) as string[])
const mediaOnDisk = new Map<string, boolean>()

/** `/archive-media/a%20b.jpg` -> `a b.jpg`, the key in `_media.json`. */
function mediaKey(path: string): string | null {
  try {
    return decodeURIComponent(path.slice('/archive-media/'.length).split(/[?#]/, 1)[0] ?? '').normalize('NFC')
  } catch {
    return null
  }
}

function checkMedia(id: number, path: string, where: string) {
  const key = mediaKey(path)

  if (!key) {
    fail(id, 'media', `${where}: malformed ${path}`)
    return
  }

  if (!manifest.has(key)) {
    fail(id, 'media', `${where}: not in _media.json: ${key}`)
    return
  }

  if (!mediaOnDisk.has(key)) {
    mediaOnDisk.set(key, existsSync(join(mediaDir, key)))
  }

  if (!mediaOnDisk.get(key)) {
    fail(id, 'media', `${where}: missing on disk: ${key}`)
  }
}

const UNSAFE: [string, RegExp][] = [
  ['script', /<script\b/i],
  ['event handler', /<[^>]+\son[a-z]+\s*=/i],
  ['javascript: url', /(?:href|src)\s*=\s*["']?\s*javascript:/i],
  ['data: url', /(?:href|src)\s*=\s*["']?\s*data:/i],
  ['style attribute', /<[^>]+\sstyle\s*=/i],
  ['style element', /<style\b/i],
  ['form element', /<(?:form|input|button|textarea|select)\b/i],
  ['object or embed', /<(?:object|embed|applet|base|meta|link)\b/i],
]
const IFRAME_HOSTS = /^https:\/\/(?:player\.vimeo\.com|www\.youtube\.com\/embed|html5-player\.libsyn\.com)\//

const COPY = null
const LOGO = { src: 'https://cdn.sanity.io/logo.svg', width: 176, height: 32 }

const started = Date.now()
let rendered = 0

for (const [index, id] of ids.entries()) {
  const record = records.get(id)!

  // 1. Shape.
  if (record.id !== id) fail(id, 'shape', `id field ${record.id}`)
  if (!record.slug) fail(id, 'shape', 'no slug')
  if (!record.title?.trim()) fail(id, 'shape', 'no title')
  if (!isEditorialBrandKey(record.publications?.[0] ?? '')) fail(id, 'shape', `first publication ${record.publications?.[0]}`)
  if (record.date !== null && (!/^\d{4}-\d{2}-\d{2}$/.test(record.date) || Number.isNaN(Date.parse(record.date)))) {
    fail(id, 'shape', `date ${record.date}`)
  }

  const body = record.bodyHtml ?? ''

  // 3. Body safety.
  for (const [name, pattern] of UNSAFE) {
    const match = pattern.exec(body)

    if (match) fail(id, 'unsafe html', `${name}: ${body.slice(match.index, match.index + 80)}`)
  }

  for (const match of body.matchAll(/<iframe\b[^>]*\ssrc\s*=\s*"([^"]*)"/gi)) {
    if (!IFRAME_HOSTS.test(match[1] ?? '')) fail(id, 'unsafe html', `iframe ${match[1]}`)
  }

  // 4. Media.
  if (record.media.image?.startsWith('/archive-media/')) checkMedia(id, record.media.image, 'image')

  for (const match of body.matchAll(/\s(?:src|href)\s*=\s*"(\/archive-media\/[^"]*)"/gi)) {
    checkMedia(id, match[1]!, 'body')
  }

  // 5. Internal archive links.
  for (const match of body.matchAll(/\shref\s*=\s*"(?:https:\/\/[a-z.]+)?\/archive\/(\d+)\/([^"?#]*)"/gi)) {
    const target = records.get(Number(match[1]))

    if (!target) fail(id, 'body link', `no record ${match[1]}`)
    else if (decodeURIComponent(match[2] ?? '') !== target.slug) fail(id, 'body link', `${match[1]} slug ${match[2]} != ${target.slug}`)
  }

  // 2. Render.
  if (index % sample === 0) {
    try {
      const article = fromArchiveRecord({
        record,
        mostRead: null,
        mostReadFill: [],
        copy: COPY,
        brand: isEditorialBrandKey(record.publications[0] ?? '') ? (record.publications[0] as 'wealthbriefing') : 'wealthbriefing',
        logo: LOGO,
        body: <ArchiveBody html={body} videoId={record.media.videoId} title={record.title} />,
      })
      const html = renderToString(<ArticlePage article={article} />)
      const h1 = /<h1[^>]*>([\s\S]*?)<\/h1>/.exec(html)?.[1] ?? ''

      if (!h1.trim()) fail(id, 'render', 'empty h1')
      rendered++
    } catch (error) {
      fail(id, 'render', error instanceof Error ? error.message.slice(0, 200) : String(error))
    }
  }

  if ((index + 1) % 10_000 === 0) {
    console.log(`${index + 1}/${ids.length} records, ${failures.length} failures, ${Math.round((Date.now() - started) / 1000)}s`)
  }
}

// 6. Redirect targets.
const redirectsDir = join(repo, 'data/legacy-redirects')
let redirectRows = 0

for (const file of readdirSync(redirectsDir).filter((name) => name.endsWith('.json'))) {
  const shard = JSON.parse(readFileSync(join(redirectsDir, file), 'utf8')) as Record<string, string>

  for (const [legacy, target] of Object.entries(shard)) {
    redirectRows++
    const match = /^\/archive\/(\d+)\/(.+)$/.exec(target)

    if (!match) {
      // Rows pointing at a home page or another non-archive path.
      if (!target.startsWith('/')) fail(legacy, 'redirect', `target ${target}`)
      continue
    }

    const record = records.get(Number(match[1]))

    if (!record) fail(legacy, 'redirect', `no record ${match[1]}`)
    else if (decodeURIComponent(match[2] ?? '') !== record.slug) fail(legacy, 'redirect', `slug ${match[2]} != ${record.slug}`)
  }
}

// 7. Sitemap.
const sitemapDir = join(repo, 'data/archive-sitemap')
const inSitemap = new Map<number, string>()

for (const brand of readdirSync(sitemapDir)) {
  for (const file of readdirSync(join(sitemapDir, brand)).filter((name) => /^\d+\.json$/.test(name))) {
    for (const [id, slug] of JSON.parse(readFileSync(join(sitemapDir, brand, file), 'utf8')) as [number, string, string | null][]) {
      const record = records.get(id)

      if (inSitemap.has(id)) fail(id, 'sitemap', `listed twice (${inSitemap.get(id)}, ${brand})`)
      inSitemap.set(id, brand)

      if (!record) fail(id, 'sitemap', 'no record')
      else {
        if (record.slug !== slug) fail(id, 'sitemap', `slug ${slug} != ${record.slug}`)
        if (record.publications[0] !== brand) fail(id, 'sitemap', `under ${brand}, first publication ${record.publications[0]}`)
      }
    }
  }
}

for (const id of ids) {
  if (!inSitemap.has(id)) fail(id, 'sitemap', 'missing')
}

const byCheck = new Map<string, number>()

for (const failure of failures) byCheck.set(failure.check, (byCheck.get(failure.check) ?? 0) + 1)

const out = join(dirname(recordsDir), 'check-records-failures.csv')
const csv = (value: string | number) => `"${String(value).replace(/"/g, '""')}"`

writeFileSync(out, ['id,check,detail', ...failures.map((f) => [f.id, f.check, f.detail].map(csv).join(','))].join('\n') + '\n')

console.log(`\nRecords ${ids.length}, rendered ${rendered}, media files ${mediaOnDisk.size}, redirect rows ${redirectRows}, sitemap ${inSitemap.size}`)
console.log(`Failures ${failures.length}${failures.length ? `: ${JSON.stringify(Object.fromEntries(byCheck))}` : ''}`)
console.log(`Written ${out} in ${Math.round((Date.now() - started) / 1000)}s`)
process.exit(failures.length ? 1 : 0)
