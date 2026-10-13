import type { NextRequest } from 'next/server'

import { fallbackBrand, resolveBrandFromHost } from '@/brands'
import { searchSite } from '@/lib/search'

/**
 * GET /api/search?q=, the header search suggestions for the brand of the requesting host, as
 * `{ posts, events, awards, resources }`, each a list of `{ title, href, meta? }`.
 * A term under 2 or over 100 characters answers empty sections.
 *
 * /api is outside the proxy matcher, so the brand is resolved here the way the proxy does it: from the Host header,
 * and only on a host that maps to no brand (Vercel previews) from the `brand` cookie or DEFAULT_BRAND.
 *
 * The answer depends on the host, so a shared cache must key on it. Vercel's and Cloudflare's default cache keys
 * include the host, and `Vary: Host` says so explicitly. A cookie-resolved answer is never stored in a shared cache.
 */
export async function GET(request: NextRequest) {
  const hostBrand = resolveBrandFromHost(request.headers.get('host') ?? '')
  const brand = hostBrand ?? fallbackBrand(request.cookies.get('brand')?.value)

  if (!brand) {
    return Response.json({ error: 'Unknown host.' }, { status: 404 })
  }

  try {
    const sections = await searchSite(request.nextUrl.searchParams.get('q'), brand)

    return Response.json(sections, {
      headers: {
        'Cache-Control': hostBrand ? 'public, max-age=0, s-maxage=60' : 'private, no-store',
        Vary: 'Host',
      },
    })
  } catch (error) {
    // The message only: the term is the visitor's input and stays out of the logs.
    console.error('[search]', error instanceof Error ? error.message : error)
    return Response.json({ error: 'Search failed.' }, { status: 502, headers: { 'Cache-Control': 'no-store' } })
  }
}
