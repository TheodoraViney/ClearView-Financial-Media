import { NextResponse, type NextRequest } from 'next/server'

import { fallbackBrand, isEditorialBrandKey, resolveBrandFromHost } from '@/brands'
import { archiveRequest } from '@/lib/archive'
import { isLegacyArticlePath, LEGACY_URL_HEADER } from '@/lib/legacy-redirects'
import { withoutEmptyListingParams } from '@/lib/shared-listings'
import { isMissingExecutiveSummary } from '@/sanity/summary-route'

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

  // The shared listings filters submitted without JavaScript: empty parameters go, with a real redirect before any
  // rendering (a redirect from the page would stream after the layout, as a 200).
  const listingQuery = resolved === 'clearview' ? withoutEmptyListingParams(pathname, request.nextUrl.searchParams) : null

  if (listingQuery !== null) {
    const clean = request.nextUrl.clone()
    clean.search = listingQuery

    return NextResponse.redirect(clean)
  }

  // Archive articles: an unknown article or a non-canonical slug gets its status here, before the layout streams.
  const archive = pathname.startsWith('/archive/') ? await archiveRequest(pathname, isEditorialBrandKey(resolved)) : null

  if (archive?.action === 'redirect') {
    const canonical = request.nextUrl.clone()
    canonical.pathname = archive.path

    return NextResponse.redirect(canonical, 308)
  }

  // An Executive Summary that does not exist, checked the same way. In draft mode the page decides, so an editor can
  // preview an unpublished report's summary.
  const missingSummary =
    pathname.startsWith('/resource/') &&
    !request.cookies.has('__prerender_bypass') &&
    (await isMissingExecutiveSummary(pathname, resolved === 'clearview'))

  const url = request.nextUrl.clone()
  url.pathname =
    archive?.action === 'missing' || missingSummary
      ? `/sites/${resolved}/archive/missing`
      : `/sites/${resolved}${pathname === '/' ? '' : pathname}`

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
  // Dotted paths are skipped, so robots.txt, llms.txt, the sitemaps and the legacy article paths are listed on their own.
  matcher: [
    '/((?!api|studio|archive-media/|_next/static|_next/image|favicon.ico|.*\\..*).*)',
    // The internal prefix with a dotted last segment (/sites/{brand}/sitemap.xml), so the 404 above covers it too.
    '/sites/:path*',
    '/robots.txt',
    '/llms.txt',
    '/sitemap.xml',
    '/sitemap/:file',
    '/archive/sitemap/:file',
    '/article.php',
    '/article.php/:path*',
    '/html/article.php',
    '/html/article.php/:path*',
  ],
}
