import { NextResponse } from 'next/server'

import { isBrandKey } from '@/brands'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ key: string }> },
) {
  const { key } = await params

  if (!isBrandKey(key)) {
    return new NextResponse(null, { status: 404 })
  }

  const response = NextResponse.redirect(new URL('/', request.url))
  response.cookies.set('brand', key, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
  })

  return response
}
