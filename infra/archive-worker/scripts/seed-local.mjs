#!/usr/bin/env node
/**
 * Fills the local R2 emulation that `wrangler dev` reads with the archive
 * export, so the Worker can be exercised without a Cloudflare account.
 *
 *   pnpm --filter @wb/archive-worker seed:local -- --records <dir> --media <dir>
 *
 * Writes `records/{id}.json` for every record, `media/{path}` for every path
 * in `<records>/_media.json`, and `meta/manifest.json` mapping each id to the
 * sha256 of its record file. Re-running overwrites, so it is safe to repeat.
 *
 * Objects go through a local-only loader Worker (`seed-worker.js`) started
 * with `wrangler dev` on the same persisted state, in batches. `getPlatformProxy`
 * opens one loopback connection per `put`, and on macOS that stalls on port
 * reuse after a few thousand objects.
 */
import { spawn } from 'node:child_process'
import { createHash } from 'node:crypto'
import { readdir, readFile, stat } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { homedir } from 'node:os'
import path from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'
import { fileURLToPath } from 'node:url'
import { parseArgs } from 'node:util'

const PACKAGE_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

// The directory `wrangler dev` uses by default, so the dev server sees the seeded data.
const PERSIST_DIR = path.join(PACKAGE_DIR, '.wrangler/state')

const BATCH_OBJECTS = 250
const BATCH_BYTES = 32 * 1024 * 1024
const PROGRESS_EVERY = 5000
const ATTEMPTS = 5

// Same table as the Worker. The Worker falls back to it when metadata is missing.
const CONTENT_TYPES = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp',
  svg: 'image/svg+xml',
  pdf: 'application/pdf',
}

const JSON_TYPE = 'application/json; charset=utf-8'

// pnpm passes the `--` separator through, and parseArgs treats everything after it as positionals.
const argv = process.argv.slice(2)
const { values } = parseArgs({
  args: argv[0] === '--' ? argv.slice(1) : argv,
  options: {
    records: { type: 'string', default: path.join(homedir(), 'wb-archive-data/records-v7') },
    media: { type: 'string', default: path.join(homedir(), 'wb-archive-data/media') },
    // Batches in flight. Each batch holds up to BATCH_OBJECTS objects.
    concurrency: { type: 'string', default: '8' },
    port: { type: 'string', default: '8797' },
  },
})

const recordsDir = path.resolve(values.records)
const mediaDir = path.resolve(values.media)
const concurrency = Number(values.concurrency)
const loaderUrl = `http://127.0.0.1:${values.port}/`

function contentType(file) {
  const extension = path.extname(file).slice(1).toLowerCase()

  return CONTENT_TYPES[extension] ?? 'application/octet-stream'
}

/** Runs `task` over `items` with at most `limit` in flight. */
async function pool(items, limit, task) {
  let next = 0

  async function worker() {
    while (next < items.length) {
      const item = items[next++]
      await task(item)
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker))
}

/** Groups `items` into batches that respect both the object and the byte cap. */
function toBatches(items, sizeOf) {
  const result = []
  let batch = []
  let bytes = 0

  for (const item of items) {
    const size = sizeOf(item)

    if (batch.length > 0 && (batch.length >= BATCH_OBJECTS || bytes + size > BATCH_BYTES)) {
      result.push(batch)
      batch = []
      bytes = 0
    }

    batch.push(item)
    bytes += size
  }

  if (batch.length > 0) {
    result.push(batch)
  }

  return result
}

/** Starts the loader Worker and resolves once it answers. */
async function startLoader() {
  const require = createRequire(import.meta.url)
  const wrangler = path.join(path.dirname(require.resolve('wrangler/package.json')), 'bin/wrangler.js')

  const child = spawn(
    process.execPath,
    [
      wrangler,
      'dev',
      '--config',
      path.join(PACKAGE_DIR, 'scripts/seed.wrangler.jsonc'),
      '--local',
      '--ip',
      '127.0.0.1',
      '--port',
      values.port,
      '--persist-to',
      PERSIST_DIR,
      '--show-interactive-dev-session=false',
      '--log-level',
      'warn',
    ],
    { stdio: ['ignore', 'inherit', 'inherit'] },
  )

  for (let attempt = 0; attempt < 120; attempt++) {
    if (child.exitCode !== null) {
      throw new Error(`loader exited with code ${child.exitCode}`)
    }

    try {
      if ((await fetch(loaderUrl)).ok) {
        return child
      }
    } catch {
      // Not listening yet.
    }

    await delay(500)
  }

  child.kill()
  throw new Error('loader did not start within 60s')
}

/** Sends `{ key, contentType, body }` objects in the loader's framing. Retries, since puts are idempotent. */
async function send(objects) {
  const index = Buffer.from(
    JSON.stringify(objects.map(({ key, contentType, body }) => ({ key, contentType, size: body.length }))),
  )
  const header = Buffer.alloc(4)
  header.writeUInt32BE(index.length)
  const payload = Buffer.concat([header, index, ...objects.map(({ body }) => body)])

  for (let attempt = 1; ; attempt++) {
    try {
      const response = await fetch(loaderUrl, { method: 'POST', body: payload })

      if (!response.ok) {
        throw new Error(`loader answered ${response.status}: ${await response.text()}`)
      }

      return
    } catch (error) {
      if (attempt >= ATTEMPTS) {
        throw error
      }

      await delay(500 * attempt)
    }
  }
}

const started = Date.now()

const recordFiles = (await readdir(recordsDir)).filter((name) => name.endsWith('.json') && !name.startsWith('_'))
const mediaPaths = JSON.parse(await readFile(path.join(recordsDir, '_media.json'), 'utf8'))

console.log(`records: ${recordFiles.length} from ${recordsDir}`)
console.log(`media:   ${mediaPaths.length} from ${mediaDir}`)

// Sizes first, so media batches stay under BATCH_BYTES without holding every file in memory.
const media = []
const missing = []

await pool(mediaPaths, 32, async (relative) => {
  try {
    media.push({ relative, size: (await stat(path.join(mediaDir, relative))).size })
  } catch {
    missing.push(relative)
  }
})

const manifest = {}
let written = 0
let reported = 0

function progress(count) {
  written += count

  if (written - reported >= PROGRESS_EVERY) {
    reported = written - (written % PROGRESS_EVERY)
    console.log(`  ${written} objects, ${((Date.now() - started) / 1000).toFixed(0)}s`)
  }
}

const loader = await startLoader()

try {
  await pool(toBatches(recordFiles, () => 1), concurrency, async (names) => {
    const objects = await Promise.all(
      names.map(async (name) => {
        const body = await readFile(path.join(recordsDir, name))
        const id = name.slice(0, -'.json'.length)
        manifest[id] = createHash('sha256').update(body).digest('hex')

        return { key: `records/${id}.json`, contentType: JSON_TYPE, body }
      }),
    )

    await send(objects)
    progress(objects.length)
  })

  await pool(
    toBatches(media, (item) => item.size),
    concurrency,
    async (batch) => {
      const objects = await Promise.all(
        batch.map(async ({ relative }) => ({
          // The list holds decoded paths. Keys use the same NFC form the Worker looks up.
          key: `media/${relative.normalize('NFC')}`,
          contentType: contentType(relative),
          body: await readFile(path.join(mediaDir, relative)),
        })),
      )

      await send(objects)
      progress(objects.length)
    },
  )

  await send([{ key: 'meta/manifest.json', contentType: JSON_TYPE, body: Buffer.from(JSON.stringify(manifest)) }])
  written++
} finally {
  loader.kill()
}

console.log(`done: ${written} objects in ${((Date.now() - started) / 1000).toFixed(1)}s`)

if (missing.length > 0) {
  console.log(`missing media files: ${missing.length}`)

  for (const relative of missing.slice(0, 20)) {
    console.log(`  ${relative}`)
  }

  process.exitCode = 1
}
