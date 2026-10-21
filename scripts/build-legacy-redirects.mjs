#!/usr/bin/env node
/**
 * Turns the legacy redirect map CSV into the shards the site reads:
 *
 *   node scripts/build-legacy-redirects.mjs [--map <redirects.csv>]
 *
 * The CSV has a header row and the columns `legacy_url, domain, method, id,
 * target_url`. Each row becomes an entry `{ [legacy key]: target path }` in
 * `data/legacy-redirects/{shard}.json`. Keys hold no domain, so the same path
 * on two domains is one entry. Keys and shards come from
 * `src/lib/legacy-redirects.ts`, which Node loads directly (Node 22.18+).
 *
 * Fails, writing nothing, on a target outside the legacy URL's domain or on
 * one path with two different targets.
 */
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseArgs } from 'node:util'

import { LEGACY_REDIRECTS_DIR, legacyKey, legacyShard } from '../src/lib/legacy-redirects.ts'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const LEGACY_DOMAINS = new Set(['wealthbriefing.com', 'wealthbriefingasia.com', 'familywealthreport.com'])

const { values } = parseArgs({
  options: {
    map: { type: 'string', default: path.join(homedir(), 'wb-archive-data/redirects/redirects.csv') },
  },
})

/** Splits one CSV line, honouring double-quoted cells. */
function cells(line) {
  const result = []
  let cell = ''
  let quoted = false

  for (let i = 0; i < line.length; i++) {
    const c = line[i]

    if (quoted) {
      if (c === '"' && line[i + 1] === '"') {
        cell += '"'
        i++
      } else if (c === '"') {
        quoted = false
      } else {
        cell += c
      }
    } else if (c === '"') {
      quoted = true
    } else if (c === ',') {
      result.push(cell)
      cell = ''
    } else {
      cell += c
    }
  }

  result.push(cell)

  return result
}

const lines = (await readFile(values.map, 'utf8')).split('\n').filter(Boolean)
const column = Object.fromEntries(cells(lines[0]).map((name, index) => [name, index]))

for (const name of ['legacy_url', 'domain', 'target_url']) {
  if (!(name in column)) {
    throw new Error(`${values.map}: missing column ${name}`)
  }
}

const shards = new Map()
const errors = []
let entries = 0

for (const line of lines.slice(1)) {
  const row = cells(line)
  const legacy = new URL(row[column.legacy_url])
  const target = new URL(row[column.target_url])
  const domain = row[column.domain]

  if (!LEGACY_DOMAINS.has(domain) || legacy.hostname.replace(/^www\./, '') !== domain || target.hostname !== domain) {
    errors.push(`not on its own domain: ${line}`)
    continue
  }

  const key = legacyKey(legacy.pathname, legacy.searchParams)
  const shard = legacyShard(key)
  const map = shards.get(shard) ?? {}
  const value = target.pathname + target.search

  if (key in map) {
    if (map[key] !== value) {
      errors.push(`two targets for ${key}: ${map[key]} and ${value}`)
    }

    continue
  }

  map[key] = value
  shards.set(shard, map)
  entries++
}

if (errors.length > 0) {
  for (const error of errors.slice(0, 20)) {
    console.error(error)
  }

  throw new Error(`${errors.length} bad rows, nothing written`)
}

const out = path.join(ROOT, LEGACY_REDIRECTS_DIR)

await rm(out, { recursive: true, force: true })
await mkdir(out, { recursive: true })

// One entry per line and sorted keys, so a rebuild diffs line by line.
for (const [shard, map] of shards) {
  const body = Object.keys(map)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${JSON.stringify(map[key])}`)
    .join(',\n')

  await writeFile(path.join(out, shard), `{\n${body}\n}\n`)
}

console.log(`${lines.length - 1} legacy URLs, ${entries} paths in ${shards.size} shards under ${LEGACY_REDIRECTS_DIR}/`)
