import { readFile } from 'node:fs/promises'
import path from 'node:path'

import type { NextRequest } from 'next/server'

import { isEditorialBrandKey } from '@/brands'
import { LEGACY_REDIRECTS_DIR, LEGACY_URL_HEADER, legacyKey, legacyShard } from '@/lib/legacy-redirects'

/**
 * Redirects a legacy article URL (`/html/article.php/...`, `/article.php/...`)
 * to its archive page on the same host. The proxy rewrites those paths here
 * with the original path and query in the `x-legacy-url` request header.
 *
 * The target comes from the generated map in `data/legacy-redirects/`, read
 * one shard at a time from the deployment (see `outputFileTracingIncludes` in
 * next.config). A path missing from the map is a 404, not a redirect to the
 * home page, which search engines would treat as a soft 404.
 *
 * `LEGACY_REDIRECT_STATUS` is 302 until destinations are confirmed under live
 * traffic, then 301.
 */

// Shards never change within a deployment. Kept per instance, so repeat hits skip the disk.
const shards = new Map<string, Promise<Record<string, string>>>()

function loadShard(name: string): Promise<Record<string, string>> {
  let shard = shards.get(name)

  if (!shard) {
    // The shards ship through outputFileTracingIncludes. The ignore comment stops the bundler from tracing the
    // whole project for this dynamic path.
    shard = readFile(path.join(/* turbopackIgnore: true */ process.cwd(), LEGACY_REDIRECTS_DIR, name), 'utf8').then(
      (text) => JSON.parse(text) as Record<string, string>,
    )
    // A failed read is retried on the next request rather than cached.
    shard.catch(() => shards.delete(name))
    shards.set(name, shard)
  }

  return shard
}

export async function GET(request: NextRequest, { params }: RouteContext<'/sites/[brand]/legacy-article'>) {
  const { brand } = await params
  const legacyUrl = request.headers.get(LEGACY_URL_HEADER)
  const host = request.headers.get('host')

  if (!isEditorialBrandKey(brand) || !legacyUrl || !host) {
    return notFound()
  }

  const legacy = new URL(legacyUrl, 'http://legacy.invalid')
  const key = legacyKey(legacy.pathname, legacy.searchParams)
  const target = (await loadShard(legacyShard(key)))[key]

  if (target === undefined) {
    // Logged so misses under live traffic can be reviewed after cutover.
    console.warn(`legacy redirect miss: ${host} ${key}`)

    return notFound()
  }

  const status = process.env.LEGACY_REDIRECT_STATUS === '301' ? 301 : 302
  // The host the reader came in on, so the redirect never leaves the domain. The request URL itself carries the
  // server's own host, not the reader's.
  const protocol = request.headers.get('x-forwarded-proto') ?? request.nextUrl.protocol.replace(/:$/, '')

  return new Response(null, {
    status,
    headers: {
      Location: new URL(target, `${protocol}://${host}`).toString(),
      // Browsers keep no copy of a 302, so a corrected map reaches them on the next visit.
      'Cache-Control': status === 301 ? 'public, max-age=86400' : 'no-store',
    },
  })
}

function notFound(): Response {
  return new Response(
    '<!doctype html><meta charset="utf-8"><title>Page not found</title><p>This page does not exist. <a href="/">Go to the home page</a>.</p>\n',
    {
      status: 404,
      headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
    },
  )
}
