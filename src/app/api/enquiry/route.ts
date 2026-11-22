import type { NextRequest } from 'next/server'

import { handleEnquiry } from '@/lib/enquiry-server'

/**
 * POST /api/enquiry, the Sponsorship enquiry and Contact forms, posted as JSON (`EnquiryRequest` in
 * src/lib/enquiry-form.ts). Answers `EnquiryResponse`, never cached. The flow is in src/lib/enquiry-server.ts.
 *
 * /api is outside the proxy matcher, so the brand is resolved there from the Host header, as /api/subscribe does.
 * Rate limiting is a firewall rule on this path, not code. The function region is pinned project-wide in vercel.json.
 */

// Node.js runtime, the default. An explicit `runtime` export is rejected while cacheComponents is on.

export function POST(request: NextRequest) {
  return handleEnquiry(request)
}
