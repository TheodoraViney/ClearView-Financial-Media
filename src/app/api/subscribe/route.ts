import type { NextRequest } from 'next/server'

import { handleSubscribe } from '@/lib/subscribe-server'

/**
 * POST /api/subscribe, the subscribe pop-up's signup, posted as JSON (`SubscribeRequest` in src/lib/subscribe.ts).
 * Answers `SubscribeResponse`, never cached. The flow is in src/lib/subscribe-server.ts.
 *
 * /api is outside the proxy matcher, so the brand is resolved there from the Host header, as /api/search does.
 * Rate limiting is a firewall rule on this path, not code. The function region is pinned project-wide in vercel.json.
 */

// Node.js runtime, the default. An explicit `runtime` export is rejected while cacheComponents is on.

export function POST(request: NextRequest) {
  return handleSubscribe(request)
}
