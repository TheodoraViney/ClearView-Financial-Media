import type { NextRequest } from 'next/server'

import { isAdUnitCode } from '@/lib/gam'
import { findAdUnit, GamApiError, isGamApiConfigured } from '@/lib/gam-api'
import { authorizeStudioRequest, bearerToken } from '@/lib/studio-auth'

/**
 * GET /api/gam/ad-unit?code=WB_Leaderboard_ROS, called from Studio's ad unit code fields in Brand settings with the
 * signed-in user's Sanity token as a bearer token. Read only: it looks the code up in Google Ad Manager.
 *
 * Answers `{ ok: true, unit }`, that unit in any status with its sizes, or null when the network has no unit with that
 * code. Failures answer `{ ok: false, error }`, written for editors. Studio shows them as a warning and never blocks
 * publishing on them, so an Ad Manager outage cannot stop anyone.
 * /api is outside the proxy matcher, so the route is reachable on every brand host and from Studio at /studio.
 */

// Account data behind a login: never cached by a browser or a CDN.
const NO_STORE = { 'cache-control': 'no-store' }

const fail = (status: number, error: string) => Response.json({ ok: false, error }, { status, headers: NO_STORE })

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code') ?? ''

  if (!isAdUnitCode(code)) {
    return fail(400, 'Letters, digits, _ . and - only, as in Google Ad Manager.')
  }

  const token = bearerToken(request)

  if (!token) {
    return fail(401, 'Sign in to Studio to check unit codes.')
  }

  const auth = await authorizeStudioRequest(token)

  if (!auth.ok) {
    // studio-auth's 403 text is about sending newsletters; this route only reads Ad Manager.
    return fail(auth.status, auth.status === 403 ? 'Only editors and administrators can check unit codes.' : auth.error)
  }

  if (!isGamApiConfigured()) {
    return fail(503, 'Unit codes cannot be checked on this site: the Ad Manager connection is not set up.')
  }

  try {
    return Response.json({ ok: true, unit: await findAdUnit(code) }, { headers: NO_STORE })
  } catch (error) {
    return failed(code, error)
  }
}

/** Logs a failure: status and message only, never the token or the key. */
function failed(code: string, error: unknown) {
  const context = `[gam] ad unit ${code}`

  if (error instanceof GamApiError) {
    console.error(`${context}: Ad Manager ${error.status} ${error.message}`)

    return error.status === 429
      ? fail(503, 'Ad Manager is busy. Try again in a moment.')
      : fail(502, `Ad Manager refused the request: ${error.message}`)
  }

  console.error(`${context}:`, error instanceof Error ? error.message : error)
  return fail(500, 'Could not reach Ad Manager. Try again.')
}
