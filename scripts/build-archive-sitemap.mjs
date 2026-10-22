#!/usr/bin/env node
/**
 * Turns the archive export records into the data behind the archive sitemap:
 *
 *   node scripts/build-archive-sitemap.mjs [--records <dir>]
 *
 * Each `{id}.json` record goes to the sitemap of its first publication, the
 * brand its canonical tag names. Files are split by ascending id, so a later
 * export only changes the last file of each brand. Layout and file size come
 * from `src/lib/archive-sitemap.ts`, which Node loads directly (Node 22.18+).
 *
 * Fails, writing nothing, on a record without a slug or an editorial first
 * publication.
 */
import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseArgs } from 'node:util'

import { ARCHIVE_SITEMAP_DIR, ARCHIVE_SITEMAP_FILE_SIZE } from '../src/lib/archive-sitemap.ts'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const EDITORIAL_BRANDS = ['wealthbriefing', 'wealthbriefingasia', 'familywealthreport']
const READ_CONCURRENCY = 64

const { values } = parseArgs({
  options: {
    records: { type: 'string', default: path.join(homedir(), 'wb-archive-data/records-v8') },
  },
})

const names = (await readdir(values.records)).filter((name) => /^\d+\.json$/.test(name))
const byBrand = new Map(EDITORIAL_BRANDS.map((brand) => [brand, []]))
const errors = []
let next = 0

async function worker() {
  while (next < names.length) {
    const name = names[next++]
    const record = JSON.parse(await readFile(path.join(values.records, name), 'utf8'))
    const home = record.publications?.[0]

    if (!record.slug || !byBrand.has(home)) {
      errors.push(`${name}: slug ${JSON.stringify(record.slug)}, publications ${JSON.stringify(record.publications)}`)
      continue
    }

    byBrand.get(home).push([record.id, record.slug, record.date ?? null])
  }
}

await Promise.all(Array.from({ length: READ_CONCURRENCY }, worker))

if (errors.length > 0) {
  for (const error of errors.slice(0, 20)) {
    console.error(error)
  }

  throw new Error(`${errors.length} bad records, nothing written`)
}

const out = path.join(ROOT, ARCHIVE_SITEMAP_DIR)

await rm(out, { recursive: true, force: true })

for (const [brand, entries] of byBrand) {
  entries.sort((a, b) => a[0] - b[0])

  const files = []

  await mkdir(path.join(out, brand), { recursive: true })

  for (let start = 0; start < entries.length; start += ARCHIVE_SITEMAP_FILE_SIZE) {
    const slice = entries.slice(start, start + ARCHIVE_SITEMAP_FILE_SIZE)
    // ISO dates sort as text.
    const lastmod = slice.reduce((latest, [, , date]) => (date && (!latest || date > latest) ? date : latest), null)

    // One entry per line, so a rebuild diffs line by line.
    await writeFile(path.join(out, brand, `${files.length}.json`), `[\n${slice.map((entry) => JSON.stringify(entry)).join(',\n')}\n]\n`)
    files.push({ lastmod })
  }

  await writeFile(path.join(out, brand, 'index.json'), `${JSON.stringify({ files }, null, 2)}\n`)
  console.log(`${brand}: ${entries.length} articles in ${files.length} files`)
}
