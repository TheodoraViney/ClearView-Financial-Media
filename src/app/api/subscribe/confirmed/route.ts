import type { NextRequest } from 'next/server'

import { handleSubscribeConfirmed } from '@/lib/subscribe-server'

/**
 * GET /api/subscribe/confirmed?t=, where Brevo sends a reader after the signup confirmation click. Emails the team when
 * the encrypted token and the contact check out, and always redirects to the brand home. The flow is in
 * src/lib/subscribe-server.ts.
 *
 * /api is outside the proxy matcher, so the brand is resolved there from the Host header. Reading the request keeps
 * the handler dynamic, and the answer says no-store.
 */

// Node.js runtime, the default. An explicit `runtime` export is rejected while cacheComponents is on.

// after() runs up to three contact reads with a 10 s timeout each, spread over 10 s, then Sanity reads and one Brevo send.
export const maxDuration = 60

export function GET(request: NextRequest) {
  return handleSubscribeConfirmed(request)
}
