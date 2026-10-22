#!/usr/bin/env node
/**
 * Writes the archive slug index the proxy reads from the export records:
 *
 *   node scripts/build-archive-slugs.mjs [--records <dir>]
 *
 * Each `{id}.json` record becomes an entry `{ [id]: slug }` in
 * `data/archive-slugs/{shard}.json`. Shards come from
 * `src/lib/archive-slugs.ts`, which Node loads directly (Node 22.18+).
 * Build it from the same records that are uploaded to R2, or the proxy and
 * the archive disagree.
 *
 * Fails, writing nothing, on a record without a slug.
 */
import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseArgs } from 'node:util'

import { ARCHIVE_SLUGS_DIR, archiveSlugShard } from '../src/lib/archive-slugs.ts'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const READ_CONCURRENCY = 64

const { values } = parseArgs({
  options: {
    records: { type: 'string', default: path.join(homedir(), 'wb-archive-data/records-v8') },
  },
})

const names = (await readdir(values.records)).filter((name) => /^\d+\.json$/.test(name))
const entries = []
const errors = []
let next = 0

async function worker() {
  while (next < names.length) {
    const name = names[next++]
    const record = JSON.parse(await readFile(path.join(values.records, name), 'utf8'))

    if (!record.slug || `${record.id}.json` !== name) {
      errors.push(`${name}: id ${record.id}, slug ${JSON.stringify(record.slug)}`)
      continue
    }

    entries.push([record.id, record.slug])
  }
}

await Promise.all(Array.from({ length: READ_CONCURRENCY }, worker))

if (errors.length > 0) {
  for (const error of errors.slice(0, 20)) {
    console.error(error)
  }

  throw new Error(`${errors.length} bad records, nothing written`)
}

const shards = new Map()

for (const [id, slug] of entries.sort((a, b) => a[0] - b[0])) {
  const shard = archiveSlugShard(id)
  const lines = shards.get(shard) ?? []

  lines.push(`${JSON.stringify(String(id))}:${JSON.stringify(slug)}`)
  shards.set(shard, lines)
}

const out = path.join(ROOT, ARCHIVE_SLUGS_DIR)

await rm(out, { recursive: true, force: true })
await mkdir(out, { recursive: true })

// One entry per line in id order, so a rebuild diffs line by line.
for (const [shard, lines] of shards) {
  await writeFile(path.join(out, shard), `{\n${lines.join(',\n')}\n}\n`)
}

console.log(`${entries.length} articles in ${shards.size} shards under ${ARCHIVE_SLUGS_DIR}/`)
