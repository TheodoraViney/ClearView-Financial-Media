import { NextResponse, type NextRequest } from 'next/server'

import { fallbackBrand, isEditorialBrandKey, resolveBrandFromHost } from '@/brands'
import { isLegacyArticlePath, LEGACY_URL_HEADER } from '@/lib/legacy-redirects'

export default function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (pathname === '/sites' || pathname.startsWith('/sites/')) {
    return new NextResponse(null, { status: 404 })
  }

  const brand = resolveBrandFromHost(request.headers.get('host') ?? '')
  const resolved = brand ?? fallbackBrand(request.cookies.get('brand')?.value)

  if (!resolved) {
    return NextResponse.next()
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
  // Dotted paths are skipped, so the legacy article paths and the archive sitemap are listed on their own.
  matcher: [
    '/((?!api|studio|archive-media/|_next/static|_next/image|favicon.ico|.*\\..*).*)',
    '/archive/sitemap/:file',
    '/article.php',
    '/article.php/:path*',
    '/html/article.php',
    '/html/article.php/:path*',
  ],
}
