import { NextResponse, type NextRequest } from 'next/server'

import { fallbackBrand, resolveBrandFromHost } from '@/brands'

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

  const response = NextResponse.rewrite(url)
  response.headers.set('x-brand', resolved)

  return response
}

export const config = {
  matcher: ['/((?!api|studio|_next/static|_next/image|favicon.ico|.*\\..*).*)'],
}
