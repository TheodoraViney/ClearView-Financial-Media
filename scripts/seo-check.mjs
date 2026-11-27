#!/usr/bin/env node
/**
 * The SEO launch checklist, per brand host, against a running site:
 *
 *   robots    /robots.txt: 200 text/plain; on production it lets crawlers in, names the AI crawlers, keeps /studio
 *             and /search out and names the brand's own sitemap index; on any other environment `Disallow: /`.
 *   sitemap   /sitemap.xml: a valid sitemap index; every child file fetched, valid, under 50,000 URLs and 50 MB,
 *             every URL absolute on the brand origin, no query string or fragment, no duplicate across files.
 *   pages     a sample of sitemap URLs, spread across the files (archive files included): 200 with no redirect,
 *             one <title> in <head>, a meta description, a canonical equal to the sitemap URL, no noindex (meta or
 *             X-Robots-Tag), og:title/description/image/url, twitter:card, a parseable ld+json block, html lang
 *             and a favicon link. Warns on a title over 60 or a description outside 70-160 characters, and on an
 *             og:image that does not load or is not 1200 px wide.
 *   status    unknown paths and slugs answer 404, an archive article under a wrong slug 308s to its canonical path,
 *             the internal /sites prefix is a 404, /search is noindex.
 *   llms      /llms.txt: 200 text/plain or markdown, starts with `# `, links absolute on the brand origin.
 *
 *   pnpm seo:check --origin <target> [options]
 *
 *   --origin <target>   `production` (each brand's primary host over https), `staging` (each brand's
 *                       BRANDS[key].stagingHost), or a URL. A URL whose host is a brand host checks that brand.
 *                       Any other URL (http://127.0.0.1:3132) is connected to with a Host header per brand,
 *                       taken from --hosts, so a local `next start` answers as the live domains.
 *   --hosts <set>       with a bare origin: `production` (default), `staging` or `local` ({key}.localhost:3000)
 *   --host <host>       with a bare origin: one Host header to send; the brand is resolved from it
 *   --brand <key>       check this brand only
 *   --env <env>         the environment the target runs as: production, staging or development. Default: from
 *                       the host (primary or apex domain = production, vercel.app staging host = staging,
 *                       *.localhost = development). It sets the expected robots.txt and the brand origin.
 *   --sample <n>        sitemap URLs to check per brand, default 30
 *   --concurrency <n>   requests in flight per brand, default 4, capped at 4
 *   --timeout <ms>      per request, default 30000
 *   --verbose           list every check, not only warnings and failures
 *
 * A protected Vercel deployment needs `VERCEL_AUTOMATION_BYPASS_SECRET` in the environment.
 * Only GET requests go out, all to the target. Exits 1 when any check fails.
 */
import http from 'node:http'
import https from 'node:https'
import { parseArgs } from 'node:util'

import { JSDOM } from 'jsdom'

import { BRAND_KEYS, BRANDS, isBrandKey, isEditorialBrandKey, resolveBrandFromHost } from '../src/brands.ts'

const GOOGLEBOT_UA =
  'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html) Chrome/130.0.0.0 Safari/537.36'
const SITEMAP_NS = 'http://www.sitemaps.org/schemas/sitemap/0.9'
const MAX_SITEMAP_URLS = 50_000
const MAX_SITEMAP_BYTES = 50 * 1024 * 1024
const AI_CRAWLERS = ['GPTBot', 'ClaudeBot', 'PerplexityBot', 'Google-Extended', 'CCBot']
const OG_IMAGE_WIDTH = 1200

const argv = process.argv.slice(2)
const { values } = parseArgs({
  args: argv[0] === '--' ? argv.slice(1) : argv,
  options: {
    origin: { type: 'string' },
    hosts: { type: 'string', default: 'production' },
    host: { type: 'string' },
    brand: { type: 'string' },
    env: { type: 'string' },
    sample: { type: 'string', default: '30' },
    concurrency: { type: 'string', default: '4' },
    timeout: { type: 'string', default: '30000' },
    verbose: { type: 'boolean', default: false },
  },
})

if (!values.origin) {
  console.error('--origin is required: production, staging or a URL. See the header of scripts/seo-check.mjs.')
  process.exit(2)
}

if (values.brand && !isBrandKey(values.brand)) {
  console.error(`--brand must be one of ${BRAND_KEYS.join(', ')}`)
  process.exit(2)
}

const sampleSize = Number(values.sample)
const concurrency = Math.min(4, Math.max(1, Number(values.concurrency)))
const timeout = Number(values.timeout)
const bypass = process.env.VERCEL_AUTOMATION_BYPASS_SECRET

/* ------------------------------------------------------------------ targets */

/** The environment a host belongs to, as brandOrigin() in src/brands.ts sees it. */
function envOfHost(host, key) {
  const name = host.split(':')[0].toLowerCase()

  if (name === BRANDS[key].stagingHost) {
    return 'staging'
  }

  if (name.endsWith('.localhost') || name === 'localhost') {
    return 'development'
  }

  return 'production'
}

/** brandOrigin() from src/brands.ts for an environment: the origin the site writes into canonicals and sitemaps. */
function brandOriginFor(key, env) {
  if (env === 'production') {
    return `https://${BRANDS[key].host}`
  }

  if (env === 'staging') {
    return `https://${BRANDS[key].stagingHost}`
  }

  return `http://${key}.localhost:3000`
}

function hostFor(key, set) {
  if (set === 'production') {
    return BRANDS[key].host
  }

  if (set === 'staging') {
    return BRANDS[key].stagingHost
  }

  if (set === 'local') {
    return `${key}.localhost:3000`
  }

  throw new Error(`--hosts must be production, staging or local, not ${set}`)
}

/** One target per brand: where to connect, which Host to send, and the origin the brand should write. */
function targets() {
  const only = values.brand ? [values.brand] : BRAND_KEYS
  const make = (key, connect, host) => {
    const env = values.env ?? envOfHost(host, key)

    return { key, connect, host, env, origin: brandOriginFor(key, env) }
  }

  if (values.origin === 'production' || values.origin === 'staging') {
    return only.map((key) => {
      const host = hostFor(key, values.origin)

      return make(key, `https://${host}`, host)
    })
  }

  const url = new URL(values.origin)
  const connect = url.origin

  if (values.host) {
    const key = values.brand ?? resolveBrandFromHost(values.host)

    if (!key) {
      throw new Error(`--host ${values.host} maps to no brand; add --brand`)
    }

    return [make(key, connect, values.host)]
  }

  const own = resolveBrandFromHost(url.host)

  if (own) {
    if (values.brand && values.brand !== own) {
      throw new Error(`--origin ${url.host} is ${own}, not ${values.brand}`)
    }

    return [make(own, connect, url.host)]
  }

  return only.map((key) => make(key, connect, hostFor(key, values.hosts)))
}

/* ------------------------------------------------------------------ http */

/**
 * A GET with no redirect following. Reads at most `limit` bytes of the body (the rest is dropped and `truncated` set)
 * and keeps the true length when the server states it. Retries once on a network error or timeout.
 */
async function get(target, pathOrUrl, { limit = 8 * 1024 * 1024, headers = {}, ua = GOOGLEBOT_UA } = {}) {
  for (let attempt = 1; ; attempt += 1) {
    try {
      return await getOnce(target, pathOrUrl, { limit, headers, ua })
    } catch (error) {
      if (attempt >= 2) {
        return { status: 0, error: error.message, headers: {}, body: '', bytes: 0 }
      }
    }
  }
}

function getOnce(target, pathOrUrl, { limit, headers, ua }) {
  // A URL on the brand origin goes to the target; any other absolute URL (an og:image on the Sanity CDN) goes direct.
  const absolute = /^https?:\/\//.test(pathOrUrl)
  const external = absolute && !pathOrUrl.startsWith(`${target.origin}/`) && pathOrUrl !== target.origin
  const url = external
    ? new URL(pathOrUrl)
    : new URL(absolute ? pathOrUrl.slice(target.origin.length) || '/' : pathOrUrl, target.connect)
  const client = url.protocol === 'https:' ? https : http
  const host = external ? url.host : target.host

  return new Promise((resolve, reject) => {
    const request = client.request(
      url,
      {
        method: 'GET',
        servername: host.split(':')[0],
        headers: {
          Host: host,
          'User-Agent': ua,
          Accept: '*/*',
          'Accept-Encoding': 'identity',
          ...(bypass && !external ? { 'x-vercel-protection-bypass': bypass } : {}),
          ...headers,
        },
        timeout,
      },
      (response) => {
        const chunks = []
        let bytes = 0
        let truncated = false

        response.on('data', (chunk) => {
          bytes += chunk.length

          if (bytes <= limit) {
            chunks.push(chunk)
          } else if (!truncated) {
            truncated = true
            response.destroy()
            finish()
          }
        })
        response.on('end', finish)
        response.on('error', (error) => (truncated ? finish() : reject(error)))

        let done = false

        function finish() {
          if (done) {
            return
          }

          done = true

          const buffer = Buffer.concat(chunks)

          resolve({
            status: response.statusCode,
            headers: response.headers,
            buffer,
            body: buffer.toString('utf8'),
            bytes: Number(response.headers['content-length']) || bytes,
            truncated,
          })
        }
      },
    )

    request.on('timeout', () => request.destroy(new Error(`timeout after ${timeout} ms`)))
    request.on('error', reject)
    request.end()
  })
}

/** Runs `fn` over `items`, `concurrency` at a time, results in order. */
async function pool(items, fn) {
  const results = new Array(items.length)
  let next = 0

  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, async () => {
      while (next < items.length) {
        const index = next++

        results[index] = await fn(items[index], index)
      }
    }),
  )

  return results
}

/* ------------------------------------------------------------------ reporting */

const AREAS = ['robots', 'sitemap', 'pages', 'status', 'llms', 'head']
const RANK = { PASS: 0, WARN: 1, FAIL: 2 }

function report() {
  const checks = []
  const add = (level, area, message, detail) => checks.push({ level, area, message, detail })

  return {
    checks,
    pass: (area, message) => add('PASS', area, message),
    warn: (area, message, detail) => add('WARN', area, message, detail),
    fail: (area, message, detail) => add('FAIL', area, message, detail),
    info: (area, message) => add('INFO', area, message),
    level(area) {
      const levels = checks.filter((check) => check.area === area && check.level in RANK).map((check) => check.level)

      return levels.length === 0 ? '-' : levels.reduce((worst, level) => (RANK[level] > RANK[worst] ? level : worst))
    },
  }
}

/* ------------------------------------------------------------------ html helpers */

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' }

function decodeEntities(text) {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, name) => {
    if (name[0] === '#') {
      const code = name[1] === 'x' || name[1] === 'X' ? parseInt(name.slice(2), 16) : Number(name.slice(1))

      return Number.isFinite(code) ? String.fromCodePoint(code) : match
    }

    return ENTITIES[name.toLowerCase()] ?? match
  })
}

/** Attributes of every `<tag ...>` in `html`, names lower-cased, values decoded. */
function tags(html, name) {
  const out = []
  const pattern = new RegExp(`<${name}\\b([^>]*)>`, 'gi')

  for (const match of html.matchAll(pattern)) {
    const attrs = {}

    for (const attr of match[1].matchAll(/([^\s=/"']+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>"']+)))?/g)) {
      attrs[attr[1].toLowerCase()] = decodeEntities(attr[2] ?? attr[3] ?? attr[4] ?? '')
    }

    out.push(attrs)
  }

  return out
}

function metaContent(metas, key, value) {
  return metas.find((meta) => (meta[key] ?? '').toLowerCase() === value)?.content ?? null
}

/** Pixel size from the first bytes of a PNG, GIF, JPEG or WebP, else null. */
function imageSize(buffer) {
  if (buffer.length >= 24 && buffer.readUInt32BE(0) === 0x89504e47) {
    return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) }
  }

  if (buffer.length >= 10 && buffer.toString('ascii', 0, 3) === 'GIF') {
    return { width: buffer.readUInt16LE(6), height: buffer.readUInt16LE(8) }
  }

  if (buffer.length >= 30 && buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') {
    const chunk = buffer.toString('ascii', 12, 16)

    if (chunk === 'VP8 ') {
      return { width: buffer.readUInt16LE(26) & 0x3fff, height: buffer.readUInt16LE(28) & 0x3fff }
    }

    if (chunk === 'VP8L') {
      const bits = buffer.readUInt32LE(21)

      return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 }
    }

    if (chunk === 'VP8X') {
      return { width: buffer.readUIntLE(24, 3) + 1, height: buffer.readUIntLE(27, 3) + 1 }
    }
  }

  if (buffer.length >= 4 && buffer[0] === 0xff && buffer[1] === 0xd8) {
    let offset = 2

    while (offset + 9 < buffer.length) {
      if (buffer[offset] !== 0xff) {
        offset += 1
        continue
      }

      const marker = buffer[offset + 1]

      if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
        return { width: buffer.readUInt16BE(offset + 7), height: buffer.readUInt16BE(offset + 5) }
      }

      offset += 2 + buffer.readUInt16BE(offset + 2)
    }
  }

  return null
}

/* ------------------------------------------------------------------ xml */

const xmlParser = new new JSDOM('').window.DOMParser()

/** Parses a sitemap document: its root name, namespace and `<loc>`/`<lastmod>` pairs, or an error. */
function parseSitemap(text) {
  const doc = xmlParser.parseFromString(text, 'application/xml')
  const error = doc.getElementsByTagName('parsererror')[0]

  if (error) {
    return { error: `not well-formed XML: ${error.textContent.trim().split('\n')[0].slice(0, 160)}` }
  }

  const root = doc.documentElement
  const childName = root.localName === 'sitemapindex' ? 'sitemap' : 'url'
  const entries = [...root.getElementsByTagNameNS(SITEMAP_NS, childName)].map((node) => ({
    loc: node.getElementsByTagNameNS(SITEMAP_NS, 'loc')[0]?.textContent.trim() ?? null,
    lastmod: node.getElementsByTagNameNS(SITEMAP_NS, 'lastmod')[0]?.textContent.trim() ?? null,
  }))

  return { root: root.localName, namespace: root.namespaceURI, entries }
}

const W3C_DATE = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2}))?$/

/* ------------------------------------------------------------------ checks */

const random = () => `seo-check-${Math.random().toString(36).slice(2, 10)}`
const pathOf = (url) => {
  try {
    const parsed = new URL(url)

    return `${parsed.pathname}${parsed.search}`
  } catch {
    return url
  }
}
const describe = (response) =>
  response.status === 0 ? `no response (${response.error})` : `${response.status}${response.headers.location ? ` -> ${response.headers.location}` : ''}`

async function checkRobots(target, r) {
  const response = await get(target, '/robots.txt', { limit: 256 * 1024 })

  if (response.status !== 200) {
    r.fail('robots', `/robots.txt answered ${describe(response)}`)

    return
  }

  const type = response.headers['content-type'] ?? ''

  if (!type.startsWith('text/plain')) {
    r.fail('robots', `/robots.txt Content-Type is "${type}", not text/plain`)
  }

  // Groups: consecutive User-agent lines share the rules that follow them.
  const groups = []
  const sitemaps = []
  let current = null

  for (const raw of response.body.split(/\r?\n/)) {
    const line = raw.replace(/#.*/, '').trim()
    const match = /^([A-Za-z-]+)\s*:\s*(.*)$/.exec(line)

    if (!match) {
      continue
    }

    const field = match[1].toLowerCase()
    const value = match[2].trim()

    if (field === 'sitemap') {
      sitemaps.push(value)
    } else if (field === 'user-agent') {
      if (!current || current.rules.length > 0) {
        current = { agents: [], rules: [] }
        groups.push(current)
      }

      current.agents.push(value.toLowerCase())
    } else if (current && (field === 'allow' || field === 'disallow')) {
      current.rules.push({ field, value })
    }
  }

  const star = groups.find((group) => group.agents.includes('*'))
  const blocksAll = star?.rules.some((rule) => rule.field === 'disallow' && rule.value === '/') ?? false

  if (target.env !== 'production') {
    if (blocksAll) {
      r.pass('robots', `${target.env}: "User-agent: * / Disallow: /", crawlers kept out as expected`)
    } else {
      r.fail('robots', `${target.env} environment does not Disallow: / for every crawler, so it can be indexed`)
    }

    return
  }

  if (!star) {
    r.fail('robots', 'no "User-agent: *" group')

    return
  }

  if (blocksAll) {
    r.fail('robots', 'production robots.txt has "Disallow: /" for every crawler (built without NEXT_PUBLIC_SITE_ENV=production?)')
  } else if (star.rules.some((rule) => rule.field === 'allow' && rule.value === '/')) {
    r.pass('robots', 'User-agent * allows /')
  } else {
    r.warn('robots', 'User-agent * has no explicit "Allow: /"')
  }

  const expectedSitemap = `${target.origin}/sitemap.xml`

  if (sitemaps.includes(expectedSitemap)) {
    r.pass('robots', `Sitemap: ${expectedSitemap}`)
  } else {
    r.fail('robots', `no "Sitemap: ${expectedSitemap}" line (found: ${sitemaps.join(', ') || 'none'})`)
  }

  const named = groups.flatMap((group) => group.agents)
  const missing = AI_CRAWLERS.filter((agent) => !named.includes(agent.toLowerCase()))

  if (missing.length === AI_CRAWLERS.length) {
    r.fail('robots', `no AI crawler named (${AI_CRAWLERS.join(', ')})`)
  } else if (missing.length > 0) {
    r.warn('robots', `AI crawlers not named: ${missing.join(', ')}`)
  } else {
    r.pass('robots', `AI crawlers named: ${AI_CRAWLERS.join(', ')}`)
  }

  for (const group of groups.filter((group) => group.agents.some((agent) => AI_CRAWLERS.some((ai) => ai.toLowerCase() === agent)))) {
    if (group.rules.some((rule) => rule.field === 'disallow' && rule.value === '/')) {
      r.warn('robots', `AI crawler group ${group.agents.join(', ')} is blocked from /`)
    }
  }

  const disallows = star.rules.filter((rule) => rule.field === 'disallow').map((rule) => rule.value)

  for (const path of ['/studio', '/search']) {
    if (disallows.some((value) => value === path || value.startsWith(`${path}$`) || value.startsWith(`${path}/`))) {
      r.pass('robots', `${path} disallowed`)
    } else {
      r.fail('robots', `${path} is not disallowed for User-agent *`)
    }
  }
}

/** Fetches the sitemap index and every child; returns the URLs per child for sampling. */
/** The sitemap index's files, or null after reporting why it is unusable. */
async function readSitemapIndex(target, r) {
  const index = await get(target, '/sitemap.xml', { limit: MAX_SITEMAP_BYTES + 1 })

  if (index.status !== 200) {
    r.fail('sitemap', `/sitemap.xml answered ${describe(index)}`)

    return null
  }

  const parsed = parseSitemap(index.body)

  if (parsed.error) {
    r.fail('sitemap', `/sitemap.xml ${parsed.error}`)

    return null
  }

  if (parsed.root !== 'sitemapindex' || parsed.namespace !== SITEMAP_NS) {
    r.fail('sitemap', `/sitemap.xml root is <${parsed.root}> in "${parsed.namespace}", not a sitemap index`)

    return null
  }

  const type = index.headers['content-type'] ?? ''

  if (!/xml/.test(type)) {
    r.warn('sitemap', `/sitemap.xml Content-Type is "${type}"`)
  }

  return parsed.entries
}

/**
 * Without a usable index, the files the site would name, so the rest of the checklist still runs: the first CMS file
 * and, on an editorial brand, the files of the archive's own index.
 */
async function fallbackSitemapFiles(target, r) {
  const files = [{ loc: `${target.origin}/sitemap/0.xml` }]

  if (isEditorialBrandKey(target.key)) {
    const archive = await get(target, '/archive/sitemap/index.xml', { limit: MAX_SITEMAP_BYTES + 1 })
    const parsed = archive.status === 200 ? parseSitemap(archive.body) : null

    files.push(...(parsed?.root === 'sitemapindex' ? parsed.entries : []))
  }

  r.info('sitemap', `index unusable; checking ${files.length} file(s) found directly (/sitemap/0.xml, /archive/sitemap/index.xml)`)

  return files
}

async function checkSitemaps(target, r) {
  const children = (await readSitemapIndex(target, r)) ?? (await fallbackSitemapFiles(target, r))
  const offOrigin = children.filter(({ loc }) => !loc?.startsWith(`${target.origin}/`))

  if (children.length === 0) {
    r.fail('sitemap', '/sitemap.xml names no sitemap file')

    return []
  }

  if (offOrigin.length > 0) {
    r.fail('sitemap', `${offOrigin.length} sitemap file(s) in the index are not on ${target.origin}`, offOrigin.map(({ loc }) => loc))
  }

  const seen = new Map()
  const duplicates = []
  const files = await pool(
    children.filter(({ loc }) => loc?.startsWith(`${target.origin}/`)),
    async ({ loc }) => {
      const response = await get(target, loc, { limit: MAX_SITEMAP_BYTES + 1 })
      const name = pathOf(loc)

      if (response.status !== 200) {
        r.fail('sitemap', `${name} answered ${describe(response)}`)

        return { name, urls: [] }
      }

      if (response.bytes >= MAX_SITEMAP_BYTES || response.truncated) {
        r.fail('sitemap', `${name} is ${response.bytes} bytes, over the 50 MB limit`)
      }

      const child = parseSitemap(response.body)

      if (child.error) {
        r.fail('sitemap', `${name} ${child.error}`)

        return { name, urls: [] }
      }

      if (child.root !== 'urlset' || child.namespace !== SITEMAP_NS) {
        r.fail('sitemap', `${name} root is <${child.root}>, not a urlset in the sitemap namespace`)

        return { name, urls: [] }
      }

      if (child.entries.length >= MAX_SITEMAP_URLS) {
        r.fail('sitemap', `${name} has ${child.entries.length} URLs, at or over the 50,000 limit`)
      }

      const bad = []
      const badDates = []

      for (const { loc: url, lastmod } of child.entries) {
        if (!url || !url.startsWith(target.origin) || (url !== target.origin && url[target.origin.length] !== '/')) {
          bad.push(`${url} (not on ${target.origin})`)
        } else if (/[?#]/.test(url)) {
          bad.push(`${url} (query string or fragment)`)
        }

        if (lastmod && !W3C_DATE.test(lastmod)) {
          badDates.push(`${url} lastmod "${lastmod}"`)
        }

        if (url) {
          if (seen.has(url)) {
            duplicates.push(`${url} (${seen.get(url)} and ${name})`)
          } else {
            seen.set(url, name)
          }
        }
      }

      if (bad.length > 0) {
        r.fail('sitemap', `${name}: ${bad.length} URL(s) not absolute on the brand origin or with a query`, bad)
      }

      if (badDates.length > 0) {
        r.warn('sitemap', `${name}: ${badDates.length} lastmod value(s) not a W3C date`, badDates)
      }

      if (child.entries.length === 0) {
        r.warn('sitemap', `${name} lists no URL`)
      }

      return { name, urls: child.entries.map(({ loc: url }) => url).filter(Boolean) }
    },
  )

  if (duplicates.length > 0) {
    r.fail('sitemap', `${duplicates.length} URL(s) listed more than once`, duplicates)
  }

  const total = files.reduce((sum, file) => sum + file.urls.length, 0)

  r.pass('sitemap', `${children.length} file(s), ${total} URLs`)

  return files
}

/**
 * Up to `n` random URLs: half from the CMS files and half from the archive files (when a brand has both), and within
 * each half one from every file first, the rest in proportion to file size.
 */
function sample(files, n) {
  const groups = [files.filter((file) => !file.name.startsWith('/archive/')), files.filter((file) => file.name.startsWith('/archive/'))]
    .map((group) => group.filter((file) => file.urls.length > 0))
    .filter((group) => group.length > 0)
  const picked = []

  for (const [index, group] of groups.entries()) {
    const share = Math.ceil((n - picked.length) / (groups.length - index))

    picked.push(...sampleGroup(group, share))
  }

  return picked
}

function sampleGroup(files, n) {
  const pools = files.filter((file) => file.urls.length > 0).map((file) => ({ ...file, left: [...file.urls] }))
  const picked = []
  const take = (file) => {
    const [url] = file.left.splice(Math.floor(Math.random() * file.left.length), 1)

    picked.push({ url, file: file.name })
  }

  for (const file of pools.sort(() => Math.random() - 0.5)) {
    if (picked.length < n) {
      take(file)
    }
  }

  while (picked.length < n) {
    const remaining = pools.filter((file) => file.left.length > 0)
    const total = remaining.reduce((sum, file) => sum + file.left.length, 0)

    if (total === 0) {
      break
    }

    let ticket = Math.random() * total
    const file = remaining.find((candidate) => (ticket -= candidate.left.length) < 0) ?? remaining[0]

    take(file)
  }

  return picked
}

const imageCache = new Map()

/** Whether an og:image loads as an image, and its width: from the first 64 KB, or the Sanity CDN `w` parameter. */
function checkImage(target, url) {
  if (!imageCache.has(url)) {
    imageCache.set(
      url,
      (async () => {
        const response = await get(target, url, { limit: 64 * 1024, ua: 'seo-check' })
        const type = response.headers['content-type'] ?? ''

        if (response.status !== 200 && response.status !== 206) {
          return { problem: 'og:image does not load', detail: `${url} ${describe(response)}` }
        }

        if (!type.startsWith('image/')) {
          return { problem: 'og:image is not an image', detail: `${url} "${type}"` }
        }

        const size = imageSize(response.buffer)
        const width = size?.width ?? Number(new URL(url).searchParams.get('w')) ?? null

        return width && width !== OG_IMAGE_WIDTH
          ? { problem: `og:image not ${OG_IMAGE_WIDTH} px wide`, detail: `${size ? `${size.width}x${size.height}` : `w=${width}`} ${url}` }
          : { problem: null }
      })(),
    )
  }

  return imageCache.get(url)
}

async function checkPage(target, url, r) {
  const response = await get(target, url)
  const name = pathOf(url) || '/'
  const failures = []
  const warnings = []

  if (response.status !== 200) {
    r.fail('pages', `${name} answered ${describe(response)}`)

    return null
  }

  const html = response.body
  const headEnd = html.search(/<\/head>/i)
  const head = headEnd === -1 ? html : html.slice(0, headEnd)
  const metas = tags(head, 'meta')
  const links = tags(head, 'link')
  const titles = [...head.matchAll(/<title\b[^>]*>([\s\S]*?)<\/title>/gi)].map((match) => decodeEntities(match[1]).trim())

  if (headEnd === -1) {
    failures.push(['no </head>', ''])
  }

  if (titles.length !== 1) {
    // Metadata streamed into <body> is what a non-bot render looks like: a cached render served to a bot.
    const inBody = headEnd === -1 ? 0 : (html.slice(headEnd).match(/<title\b/gi) ?? []).length
    const cache = response.headers['x-vercel-cache'] ?? response.headers['x-nextjs-cache']

    failures.push([
      'not exactly one <title> in <head>',
      `${titles.length} in head, ${inBody} in body${cache ? `, cache ${cache}` : ''}`,
    ])
  } else if (!titles[0]) {
    failures.push(['empty <title>', ''])
  } else if (titles[0].length > 60) {
    warnings.push(['title over 60 characters (suffix included)', `${titles[0].length}: "${titles[0]}"`])
  }

  const description = metaContent(metas, 'name', 'description')?.trim()

  if (!description) {
    failures.push(['no meta description', ''])
  } else if (description.length < 70 || description.length > 160) {
    warnings.push(['description outside 70-160 characters', `${description.length}`])
  }

  const canonicals = links.filter((link) => link.rel?.toLowerCase().split(/\s+/).includes('canonical'))

  if (canonicals.length !== 1) {
    failures.push(['not exactly one canonical link', `${canonicals.length}`])
  } else if (canonicals[0].href !== url) {
    const same = (() => {
      try {
        return decodeURI(canonicals[0].href) === decodeURI(url)
      } catch {
        return false
      }
    })()

    ;(same ? warnings : failures).push([
      same ? 'canonical differs from the sitemap URL in encoding only' : 'canonical is not the sitemap URL',
      canonicals[0].href,
    ])
  }

  const robots = [metaContent(metas, 'name', 'robots'), metaContent(metas, 'name', 'googlebot')].filter(Boolean).join(', ')
  const robotsHeader = [response.headers['x-robots-tag']].flat().filter(Boolean).join(', ')

  if (/noindex|none/i.test(robots)) {
    failures.push(['noindex in meta robots', robots])
  }

  if (/noindex|none/i.test(robotsHeader)) {
    failures.push(['noindex in X-Robots-Tag', robotsHeader])
  }

  for (const property of ['og:title', 'og:description', 'og:image', 'og:url']) {
    if (!metaContent(metas, 'property', property)) {
      failures.push([`no ${property}`, ''])
    }
  }

  const ogUrl = metaContent(metas, 'property', 'og:url')

  if (ogUrl && canonicals[0]?.href && ogUrl !== canonicals[0].href) {
    warnings.push(['og:url is not the canonical', ogUrl])
  }

  if (!metaContent(metas, 'name', 'twitter:card')) {
    failures.push(['no twitter:card', ''])
  }

  const blocks = [...html.matchAll(/<script\b[^>]*type=["']?application\/ld\+json["']?[^>]*>([\s\S]*?)<\/script>/gi)]
  const parsedBlocks = blocks.filter((block) => {
    try {
      JSON.parse(block[1])

      return true
    } catch {
      return false
    }
  })

  if (blocks.length === 0) {
    failures.push(['no ld+json block', ''])
  } else if (parsedBlocks.length < blocks.length) {
    failures.push(['ld+json that does not parse', `${blocks.length - parsedBlocks.length} of ${blocks.length}`])
  }

  const lang = tags(html.slice(0, 2000), 'html')[0]?.lang

  if (!lang) {
    r.fail('head', '<html> has no lang', [name])
  }

  const favicon = links.some((link) => /(^|\s)(icon|shortcut icon)(\s|$)/i.test(link.rel ?? ''))

  const image = metaContent(metas, 'property', 'og:image')

  if (image) {
    const { problem, detail } = await checkImage(target, image)

    if (problem) {
      warnings.push([problem, detail])
    }
  }

  for (const [kind, detail] of failures) {
    r.fail('pages', kind, [detail ? `${name}  ${detail}` : name])
  }

  for (const [kind, detail] of warnings) {
    r.warn('pages', kind, [detail ? `${name}  ${detail}` : name])
  }

  return { favicon, lang }
}

async function checkPages(target, files, r) {
  const picked = sample(files, sampleSize)

  if (picked.length === 0) {
    r.fail('pages', 'no sitemap URL to sample')

    return
  }

  const results = await pool(picked, ({ url }) => checkPage(target, url, r))
  const rendered = results.filter(Boolean)
  const archive = picked.filter(({ file }) => file.startsWith('/archive/')).length

  r.pass('pages', `${picked.length} sampled (${archive} archive), ${rendered.length} rendered`)

  const withoutFavicon = rendered.filter((result) => !result.favicon).length

  if (rendered.length > 0 && withoutFavicon === rendered.length) {
    const fallback = await get(target, '/favicon.ico', { limit: 64 * 1024 })

    r.warn(
      'head',
      `no favicon <link rel="icon"> on any sampled page; /favicon.ico answers ${describe(fallback)} ${fallback.headers['content-type'] ?? ''} ${fallback.bytes} bytes`,
    )
  } else if (withoutFavicon > 0) {
    r.warn('head', `${withoutFavicon} of ${rendered.length} sampled pages have no favicon link`)
  } else if (rendered.length > 0) {
    r.pass('head', `favicon link and lang on ${rendered.length} pages`)
  }

  return picked
}

async function checkStatuses(target, picked, r) {
  const slug = random()
  const notFound = [
    `/${slug}`,
    `/${slug}/${slug}`,
    `/posts/${slug}`,
    `/events/${slug}`,
    `/awards/${slug}`,
    `/awards/${slug}/${slug}`,
    `/resource/${slug}`,
    `/resource/${slug}/executive-summary`,
    `/companies/${slug}`,
    '/archive/999999999/x',
    `/sites/${target.key}/robots.txt`,
    `/sites/${target.key}`,
    `/sitemap/9999.xml`,
  ]

  await pool(notFound, async (path) => {
    const response = await get(target, path)

    if (response.status === 404) {
      r.pass('status', `${path} 404`)
    } else {
      r.fail('status', `${path} answered ${describe(response)}, expected 404`)
    }
  })

  // An archive article under a wrong slug: one 308 to the canonical path.
  const article = picked.find(({ file }) => file.startsWith('/archive/'))

  if (article) {
    const canonical = new URL(article.url).pathname
    const id = /^\/archive\/(\d+)\//.exec(canonical)?.[1]
    const path = `/archive/${id}/${slug}`
    const response = await get(target, path)
    const location = response.headers.location ? new URL(response.headers.location, target.connect).pathname : null

    if (response.status === 308 && location === canonical) {
      r.pass('status', `${path} 308 to ${canonical}`)
    } else {
      r.fail('status', `${path} answered ${describe(response)}, expected 308 to ${canonical}`)
    }
  } else if (isEditorialBrandKey(target.key)) {
    r.warn('status', 'no archive URL sampled, wrong-slug 308 not checked')
  }

  const search = await get(target, '/search?q=wealth')
  const metas = tags(search.body.split(/<\/head>/i)[0], 'meta')
  const robots = metaContent(metas, 'name', 'robots') ?? ''

  if (search.status === 200 && /noindex/i.test(robots)) {
    r.pass('status', '/search is noindex')
  } else if (search.status !== 200) {
    r.warn('status', `/search answered ${describe(search)}`)
  } else {
    r.fail('status', `/search meta robots is "${robots}", expected noindex`)
  }

  const studio = await get(target, '/studio')
  const studioHeader = [studio.headers['x-robots-tag']].flat().filter(Boolean).join(', ')
  const studioMeta = metaContent(tags(studio.body.split(/<\/head>/i)[0], 'meta'), 'name', 'robots') ?? ''

  r.info('status', `/studio answered ${describe(studio)}; meta robots "${studioMeta}", X-Robots-Tag "${studioHeader}"`)
}

async function checkLlms(target, r) {
  const response = await get(target, '/llms.txt', { limit: 1024 * 1024 })

  if (response.status !== 200) {
    r.fail('llms', `/llms.txt answered ${describe(response)}`)

    return
  }

  const type = response.headers['content-type'] ?? ''

  if (!/^text\/(plain|markdown)/.test(type)) {
    r.fail('llms', `/llms.txt Content-Type is "${type}"`)
  }

  if (!response.body.startsWith('# ')) {
    r.fail('llms', '/llms.txt does not start with "# "')
  }

  const urls = [...response.body.matchAll(/\]\(([^)\s]+)\)/g)].map((match) => match[1])
  const relative = urls.filter((url) => !/^https?:\/\//.test(url))
  const elsewhere = urls.filter((url) => /^https?:\/\//.test(url) && url !== target.origin && !url.startsWith(`${target.origin}/`))

  if (relative.length > 0) {
    r.fail('llms', `${relative.length} relative link(s)`, relative)
  }

  if (elsewhere.length > 0) {
    r.warn('llms', `${elsewhere.length} of ${urls.length} link(s) off ${target.origin}`, elsewhere)
  }

  if (relative.length === 0 && elsewhere.length === 0) {
    r.pass('llms', `${urls.length} links, all on ${target.origin}`)
  }
}

/* ------------------------------------------------------------------ main */

async function checkBrand(target) {
  const r = report()

  await checkRobots(target, r)

  const files = await checkSitemaps(target, r)
  const picked = files.length > 0 ? await checkPages(target, files, r) : []

  await checkStatuses(target, picked ?? [], r)
  await checkLlms(target, r)

  return r
}

const list = targets()
const results = []

for (const target of list) {
  const label = target.connect.includes(target.host) ? target.connect : `${target.connect} as ${target.host}`

  console.error(`checking ${target.key} (${label}, env ${target.env}, origin ${target.origin}) ...`)
  results.push({ target, report: await checkBrand(target) })
}

const width = Math.max(...list.map((target) => target.key.length), 5)

console.log('')
console.log(['brand'.padEnd(width), 'env'.padEnd(11), ...AREAS.map((area) => area.padEnd(7))].join('  '))

for (const { target, report: r } of results) {
  console.log([target.key.padEnd(width), target.env.padEnd(11), ...AREAS.map((area) => r.level(area).padEnd(7))].join('  '))
}

let failed = false

for (const { target, report: r } of results) {
  const shown = r.checks.filter((check) => values.verbose || check.level === 'FAIL' || check.level === 'WARN' || check.level === 'INFO')

  if (shown.length === 0) {
    continue
  }

  console.log(`\n${target.key} (${target.origin})`)

  // Checks with the same level, area and message print once, with their details together.
  const groups = new Map()

  for (const check of shown) {
    const key = `${check.level}\u0000${check.area}\u0000${check.message}`
    const group = groups.get(key) ?? { ...check, count: 0, detail: [] }

    group.count += 1
    group.detail.push(...(check.detail ?? []))
    groups.set(key, group)
  }

  const limit = values.verbose ? Infinity : 8

  for (const group of [...groups.values()].sort((a, b) => (RANK[b.level] ?? -1) - (RANK[a.level] ?? -1))) {
    const count = group.count > 1 ? ` (${group.count})` : ''

    console.log(`  ${group.level.padEnd(4)} ${group.area.padEnd(7)} ${group.message}${count}`)

    for (const line of group.detail.slice(0, limit)) {
      console.log(`         ${line}`)
    }

    if (group.detail.length > limit) {
      console.log(`         ... ${group.detail.length - limit} more (--verbose lists all)`)
    }
  }

  failed ||= r.checks.some((check) => check.level === 'FAIL')
}

process.exit(failed ? 1 : 0)
