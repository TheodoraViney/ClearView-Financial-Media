/**
 * Builds the site search records and, with --write, sends them to the Algolia index (src/lib/search-index.ts).
 *
 *   bun scripts/algolia/index-records.tsx [--archive] [--cms] [--settings] [--since <year>] [--records <dir>] [--write]
 *
 *   --archive   records from the archive export, default dir ~/wb-archive-data/records-v8
 *   --since     archive articles dated from that year on (undated ones too); for the Free plan's 50k record cap
 *   --cms       published posts, conference events, awards editions and resources from Sanity, read without a token
 *   --settings  apply SEARCH_INDEX_SETTINGS
 *   --write     send to Algolia with ALGOLIA_APP_ID and ALGOLIA_WRITE_KEY from .env.local. Without it nothing leaves
 *               this machine except the Sanity read: the records are built and checked, and a sample is printed.
 *
 * Checks every record: a title, a slug, and under the 10 KB record limit. Records are upserts, so a rerun replaces
 * them; nothing is deleted from the index.
 */

import { readdirSync, readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

import { createClient } from 'next-sanity'

import { algoliaBatch, algoliaSetSettings, algoliaWaitTask } from '@/lib/algolia'
import type { ArchiveRecord } from '@/lib/archive'
import {
  archiveSearchRecord,
  cmsSearchRecord,
  SEARCH_INDEX,
  SEARCH_INDEX_SETTINGS,
  type CmsSearchSource,
  type SearchRecord,
} from '@/lib/search-index'
import { SEARCH_RECORDS_QUERY } from '@/sanity/queries'

const args = process.argv.slice(2)
const flag = (name: string) => args.includes(`--${name}`)
const option = (name: string) => {
  const index = args.indexOf(`--${name}`)

  return index >= 0 ? args[index + 1] : undefined
}

const write = flag('write')
const since = option('since')
const recordsDir = (option('records') ?? '~/wb-archive-data/records-v8').replace(/^~(?=\/)/, homedir())

if (!flag('archive') && !flag('cms') && !flag('settings')) {
  console.error('Nothing to do: pass --archive, --cms and/or --settings. See the header of this file.')
  process.exit(1)
}

const MAX_RECORD_BYTES = 10_000
const BATCH = 1_000

const records: SearchRecord[] = []
const problems: string[] = []

function add(record: SearchRecord | null, source: string) {
  if (!record) {
    problems.push(`${source}: no title, slug or searchable type`)
    return
  }

  const bytes = Buffer.byteLength(JSON.stringify(record))

  if (!record.title || !record.slug) problems.push(`${record.objectID}: no title or slug`)
  if (bytes > MAX_RECORD_BYTES) problems.push(`${record.objectID}: ${bytes} bytes`)
  records.push(record)
}

if (flag('archive')) {
  let skipped = 0

  for (const name of readdirSync(recordsDir).filter((file) => /^\d+\.json$/.test(file))) {
    const record = JSON.parse(readFileSync(join(recordsDir, name), 'utf8')) as ArchiveRecord

    if (since && record.date && record.date.slice(0, 4) < since) {
      skipped++
      continue
    }

    add(archiveSearchRecord(record), name)
  }

  console.log(`Archive: ${records.length} records${since ? `, ${skipped} before ${since} left out` : ''}`)
}

if (flag('cms')) {
  const sanity = createClient({
    projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
    dataset: process.env.NEXT_PUBLIC_SANITY_DATASET,
    apiVersion: process.env.NEXT_PUBLIC_SANITY_API_VERSION ?? '2026-09-01',
    useCdn: false,
    perspective: 'published',
  })
  const docs = (await sanity.fetch(SEARCH_RECORDS_QUERY)) as CmsSearchSource[]
  const before = records.length

  for (const doc of docs) add(cmsSearchRecord(doc), doc._id)

  console.log(`CMS: ${records.length - before} records from ${docs.length} documents`)
}

const bySection = Object.groupBy(records, (record) => record.section)
const sizes = records.map((record) => Buffer.byteLength(JSON.stringify(record))).sort((a, b) => a - b)

console.log(
  `Total ${records.length}: ${Object.entries(bySection)
    .map(([section, list]) => `${section} ${list?.length}`)
    .join(', ')}`,
)

if (sizes.length) {
  console.log(`Record size: median ${sizes[Math.floor(sizes.length / 2)]} B, max ${sizes.at(-1)} B, total ${(sizes.reduce((a, b) => a + b, 0) / 1e6).toFixed(1)} MB`)
}

if (problems.length) {
  console.log(`Problems ${problems.length}:\n  ${problems.slice(0, 20).join('\n  ')}`)
}

if (!write) {
  console.log('\nDry run, nothing sent. Samples:')

  for (const section of Object.keys(bySection)) {
    console.log(JSON.stringify(bySection[section as keyof typeof bySection]?.[0], null, 2))
  }

  process.exit(problems.length ? 1 : 0)
}

if (problems.length) {
  console.error('Not sending: fix the problems first.')
  process.exit(1)
}

if (flag('settings')) {
  await algoliaWaitTask(SEARCH_INDEX, await algoliaSetSettings(SEARCH_INDEX, SEARCH_INDEX_SETTINGS))
  console.log(`Settings applied to ${SEARCH_INDEX}`)
}

let last = null

for (let start = 0; start < records.length; start += BATCH) {
  last = await algoliaBatch(SEARCH_INDEX, records.slice(start, start + BATCH))
  console.log(`Sent ${Math.min(start + BATCH, records.length)}/${records.length}`)
}

if (last) {
  await algoliaWaitTask(SEARCH_INDEX, last)
  console.log(`Indexed ${records.length} records in ${SEARCH_INDEX}`)
}
