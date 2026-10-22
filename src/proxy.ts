import { NextResponse, type NextRequest } from 'next/server'

import { fallbackBrand, isEditorialBrandKey, resolveBrandFromHost } from '@/brands'
import { parseArchiveId } from '@/lib/archive'
import { archiveSlug } from '@/lib/archive-slug-lookup'
import { isLegacyArticlePath, LEGACY_URL_HEADER } from '@/lib/legacy-redirects'

const ARCHIVE_PATH = /^\/archive\/([^/]+)/

export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (pathname === '/sites' || pathname.startsWith('/sites/')) {
    return new NextResponse(null, { status: 404 })
  }

  const brand = resolveBrandFromHost(request.headers.get('host') ?? '')
  const resolved = brand ?? fallbackBrand(request.cookies.get('brand')?.value)

  if (!resolved) {
    return NextResponse.next()
  }

  const archiveId = isEditorialBrandKey(resolved) ? parseArchiveId(ARCHIVE_PATH.exec(pathname)?.[1]) : null

  if (archiveId !== null) {
    // The archive page streams, so it can no longer change its 200 once it finds the article missing or the slug
    // wrong. Both are settled here instead, from the slug index.
    const slug = await archiveSlug(archiveId)

    if (slug === null) {
      return new NextResponse(
        '<!doctype html><meta charset="utf-8"><title>Page not found</title><p>This page does not exist. <a href="/">Go to the home page</a>.</p>\n',
        { status: 404, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } },
      )
    }

    const canonical = `/archive/${archiveId}/${encodeURIComponent(slug)}`

    if (pathname !== canonical) {
      // The host the reader came in on, so the redirect never leaves the domain.
      const protocol = request.headers.get('x-forwarded-proto') ?? request.nextUrl.protocol.replace(/:$/, '')
      const location = new URL(`${canonical}${request.nextUrl.search}`, `${protocol}://${request.headers.get('host')}`)

      return NextResponse.redirect(location, 308)
    }
  }

  const url = request.nextUrl.clone()
  url.pathname = `/sites/${resolved}${pathname === '/' ? '' : pathname}`

  let response: NextResponse

  if (isEditorialBrandKey(resolved) && isLegacyArticlePath(pathname)) {
    // Legacy article URLs go to the redirect handler. The original path and query travel in a request header,
    // set here on every such request, so a client-sent value never reaches the handler.
    url.pathname = `/sites/${resolved}/legacy-article`

    const headers = new Headers(request.headers)
    headers.set(LEGACY_URL_HEADER, `${pathname}${request.nextUrl.search}`)
    response = NextResponse.rewrite(url, { request: { headers } })
  } else {
    response = NextResponse.rewrite(url)
  }

  response.headers.set('x-brand', resolved)

  return response
}

export const config = {
  // archive-media is rewritten to the archive Worker in next.config and must keep its path.
  // Dotted paths are skipped, so the legacy article paths are listed on their own.
  matcher: [
    '/((?!api|studio|archive-media/|_next/static|_next/image|favicon.ico|.*\\..*).*)',
    '/article.php',
    '/article.php/:path*',
    '/html/article.php',
    '/html/article.php/:path*',
  ],
}
