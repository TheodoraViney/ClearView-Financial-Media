#!/usr/bin/env node
/**
 * Checks every row of the legacy redirect map against a running site:
 *
 *   1. the legacy URL answers with the expected status (302 by default) and
 *      `Location` equal to the map's target on the same host;
 *   2. the target answers 200 with no further redirect, carries no `noindex`
 *      (meta robots or `X-Robots-Tag`), and an archive page's canonical has
 *      the same path on one of the editorial domains.
 *
 * It proves the site honours the map. Whether the map points at the right
 * article is settled by the map's own build, not here.
 *
 *   pnpm redirects:verify -- [options]
 *
 *   --map <csv>        default ~/wb-archive-data/redirects/redirects.csv
 *   --site <mode>      `local` ({brand}.localhost:3000, the default), `local:<port>`,
 *                      `live` (https://{domain}), or a list such as
 *                      `wealthbriefing.com=https://wb.example.app,...`
 *   --status <code>    expected redirect status, default 302
 *   --sample <n>       check n random rows instead of all of them
 *   --redirects-only   skip step 2
 *   --concurrency <n>  requests in flight, default 8
 *   --out <csv>        failures, default ~/wb-archive-data/redirects/verify-failures.csv
 *
 * Exits 1 when any row fails.
 */
import { readFile, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import path from 'node:path'
import { parseArgs } from 'node:util'

const LEGACY_DOMAINS = ['wealthbriefing.com', 'wealthbriefingasia.com', 'familywealthreport.com']
const PROGRESS_EVERY = 5000
const ATTEMPTS = 3

const argv = process.argv.slice(2)
const { values } = parseArgs({
  args: argv[0] === '--' ? argv.slice(1) : argv,
  options: {
    map: { type: 'string', default: path.join(homedir(), 'wb-archive-data/redirects/redirects.csv') },
    site: { type: 'string', default: 'local' },
    status: { type: 'string', default: '302' },
    sample: { type: 'string' },
    'redirects-only': { type: 'boolean', default: false },
    concurrency: { type: 'string', default: '8' },
    out: { type: 'string', default: path.join(homedir(), 'wb-archive-data/redirects/verify-failures.csv') },
  },
})

const expectedStatus = Number(values.status)
const concurrency = Number(values.concurrency)

/** Legacy domain -> origin of the site under test. */
function siteOrigins(mode) {
  if (mode === 'live') {
    return new Map(LEGACY_DOMAINS.map((domain) => [domain, `https://${domain}`]))
  }

  if (mode === 'local' || mode.startsWith('local:')) {
    const port = mode.split(':')[1] ?? '3000'

    // Brand keys are the domains without `.com`, see src/brands.ts.
    return new Map(LEGACY_DOMAINS.map((domain) => [domain, `http://${domain.replace(/\.com$/, '')}.localhost:${port}`]))
  }

  const origins = new Map(
    mode.split(',').map((pair) => {
      const [domain, origin] = pair.split('=')

      return [domain.trim(), origin.trim().replace(/\/+$/, '')]
    }),
  )

  for (const domain of LEGACY_DOMAINS) {
    if (!origins.has(domain)) {
      throw new Error(`--site has no origin for ${domain}`)
    }
  }

  return origins
}

const origins = siteOrigins(values.site)

// A canonical may name the www host or the apex, and locally the dev port; compared by hostname without www.
const bareHostname = (url) => new URL(url).hostname.replace(/^www\./, '')
const editorialHostnames = new Set([...origins.values()].map(bareHostname))

function csvCells(line) {
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

const csvCell = (value) => (/[",\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value)

async function request(url) {
  for (let attempt = 1; ; attempt++) {
    try {
      const response = await fetch(url, { redirect: 'manual' })
      const body = response.status === 200 ? await response.text() : (await response.arrayBuffer(), '')

      return { status: response.status, headers: response.headers, body }
    } catch (error) {
      if (attempt >= ATTEMPTS) {
        return { error: error.cause?.code ?? error.message }
      }
    }
  }
}

async function pool(items, limit, task) {
  let next = 0

  async function worker() {
    while (next < items.length) {
      await task(items[next++])
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker))
}

const lines = (await readFile(values.map, 'utf8')).split('\n').filter(Boolean)
const column = Object.fromEntries(csvCells(lines[0]).map((name, index) => [name, index]))
let rows = lines.slice(1).map((line) => {
  const cells = csvCells(line)

  return { legacy: cells[column.legacy_url], domain: cells[column.domain], target: cells[column.target_url] }
})

if (values.sample) {
  // Partial Fisher-Yates: the first n rows become a uniform sample.
  const n = Math.min(Number(values.sample), rows.length)

  for (let i = 0; i < n; i++) {
    const j = i + Math.floor(Math.random() * (rows.length - i))
    ;[rows[i], rows[j]] = [rows[j], rows[i]]
  }

  rows = rows.slice(0, n)
}

/** Step 2, once per distinct target URL. Resolves to null when the page passes, else the reason. */
const targetChecks = new Map()

function checkTarget(url) {
  if (!targetChecks.has(url)) {
    targetChecks.set(url, checkTargetOnce(url))
  }

  return targetChecks.get(url)
}

async function checkTargetOnce(url) {
  const response = await request(url)

  if (response.error) {
    return `target: ${response.error}`
  }

  if (response.status !== 200) {
    return `target: status ${response.status}${response.headers.get('location') ? ` -> ${response.headers.get('location')}` : ''}`
  }

  const robotsHeader = response.headers.get('x-robots-tag') ?? ''
  const robotsMeta = response.body.match(/<meta[^>]+name="robots"[^>]*>/i)?.[0] ?? ''

  if (/noindex/i.test(robotsHeader) || /noindex/i.test(robotsMeta)) {
    return 'target: noindex'
  }

  const { pathname } = new URL(url)

  if (!pathname.startsWith('/archive/')) {
    return null
  }

  const canonical = response.body.match(/<link[^>]+rel="canonical"[^>]*href="([^"]+)"/i)?.[1]

  if (!canonical) {
    return 'target: no canonical'
  }

  if (!editorialHostnames.has(bareHostname(canonical)) || new URL(canonical).pathname !== pathname) {
    return `target: canonical ${canonical}`
  }

  return null
}

async function checkRow(row) {
  const legacy = new URL(row.legacy)
  const target = new URL(row.target)
  const origin = origins.get(row.domain)
  const expectedLocation = `${origin}${target.pathname}${target.search}`
  const response = await request(`${origin}${legacy.pathname}${legacy.search}`)

  if (response.error) {
    return `legacy: ${response.error}`
  }

  if (response.status !== expectedStatus) {
    return `legacy: status ${response.status}, expected ${expectedStatus}`
  }

  const location = response.headers.get('location')

  if (location !== expectedLocation) {
    return `legacy: location ${location}`
  }

  return values['redirects-only'] ? null : checkTarget(expectedLocation)
}

const started = Date.now()
const failures = []
let done = 0

console.log(`checking ${rows.length} rows against ${values.site}${values['redirects-only'] ? ', redirects only' : ''}`)

await pool(rows, concurrency, async (row) => {
  const reason = await checkRow(row)

  if (reason) {
    failures.push({ ...row, reason })
  }

  if (++done % PROGRESS_EVERY === 0) {
    console.log(`  ${done}/${rows.length}, ${failures.length} failed, ${((Date.now() - started) / 1000).toFixed(0)}s`)
  }
})

const byReason = {}

for (const failure of failures) {
  const kind = failure.reason.split(' ').slice(0, 2).join(' ')
  byReason[kind] = (byReason[kind] ?? 0) + 1
}

await writeFile(
  values.out,
  ['legacy_url,domain,target_url,reason', ...failures.map((f) => [f.legacy, f.domain, f.target, f.reason].map(csvCell).join(','))].join('\n') + '\n',
)

console.log(`done in ${((Date.now() - started) / 1000).toFixed(0)}s: ${rows.length - failures.length} passed, ${failures.length} failed`)

if (failures.length > 0) {
  console.log(byReason)
  console.log(`failures: ${values.out}`)
  process.exitCode = 1
}
