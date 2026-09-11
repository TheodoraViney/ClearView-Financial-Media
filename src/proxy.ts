import { NextResponse, type NextRequest } from 'next/server'

import { isBrandKey, resolveBrandFromHost } from '@/brands'

export default function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (pathname === '/sites' || pathname.startsWith('/sites/')) {
    return new NextResponse(null, { status: 404 })
  }

  const brand = resolveBrandFromHost(request.headers.get('host') ?? '')
  const resolved = brand ?? fallbackBrand(request)

  if (!resolved) {
    return NextResponse.next()
  }

  const url = request.nextUrl.clone()
  url.pathname = `/sites/${resolved}${pathname === '/' ? '' : pathname}`

  const response = NextResponse.rewrite(url)
  response.headers.set('x-brand', resolved)

  return response
}

// Consulted only when the host maps to no brand (Vercel preview URLs), so a production host can never be switched by a visitor.
function fallbackBrand(request: NextRequest) {
  const cookie = request.cookies.get('brand')?.value
  if (cookie && isBrandKey(cookie)) {
    return cookie
  }

  const fromEnv = process.env.DEFAULT_BRAND
  if (fromEnv && isBrandKey(fromEnv)) {
    return fromEnv
  }

  return null
}

export const config = {
  matcher: ['/((?!api|studio|_next/static|_next/image|favicon.ico|.*\\..*).*)'],
}
