import { draftMode } from 'next/headers'
import { NextResponse, type NextRequest } from 'next/server'

/*
 * Leaves draft mode: clears the draft-mode cookie and Sanity's perspective cookie, then returns to the page the editor
 * was on. The draft-mode cookie is set for the whole host by /api/draft-mode/enable when Presentation opens, and the
 * Studio lives on the same host, so without this the site keeps showing drafts and Visual Editing outside the Studio.
 * The way back is the Referer when it is a page of this host, else the home page: never another origin.
 */
export async function GET(request: NextRequest) {
  ;(await draftMode()).disable()

  // A relative Location, resolved by the browser against the brand host it asked: request.nextUrl names the server's
  // own host in dev, not the brand subdomain.
  const host = request.headers.get('host')
  const referer = request.headers.get('referer')
  let back = '/'

  if (host && referer) {
    try {
      const url = new URL(referer)
      const path = url.pathname
      // `//x` would be a protocol-relative Location to another origin.
      if (url.host === host && !path.startsWith('//') && !path.startsWith('/studio') && !path.startsWith('/api/')) {
        back = `${path}${url.search}`
      }
    } catch {
      // A malformed Referer goes home.
    }
  }

  const response = new NextResponse(null, { status: 303, headers: { Location: back } })
  response.cookies.delete('sanity-preview-perspective')
  response.headers.set('Cache-Control', 'no-store')

  return response
}
