import type { NextRequest } from 'next/server'

import { BrevoError } from '@/lib/brevo'
import {
  isNewsletterAction,
  NewsletterActionError,
  parseIssueId,
  runNewsletterAction,
} from '@/lib/newsletter-sending'
import { authorizeStudioRequest, bearerToken } from '@/lib/studio-auth'

/**
 * POST /api/newsletter/{test|send|schedule|cancel|sync} with `{ "issueId": "..." }`, called from Studio's newsletter
 * issue actions with the signed-in user's Sanity token as a bearer token.
 *
 * Answers `{ ok: true, status, campaignId, message }` or `{ ok: false, error }`. The error is written for editors.
 * /api is outside the proxy matcher, so the route is reachable on every brand host and from Studio at /studio.
 * The function region is pinned project-wide in vercel.json.
 */

// Node.js runtime, the default. An explicit `runtime` export is rejected while cacheComponents is on.

// Up to five Brevo calls with a 10 s timeout each, plus Sanity reads and writes. Below the 2-minute stale-lock age.
export const maxDuration = 60

const fail = (status: number, error: string) => Response.json({ ok: false, error }, { status })

export async function POST(request: NextRequest, context: { params: Promise<{ action: string }> }) {
  const { action } = await context.params

  if (!isNewsletterAction(action)) {
    return fail(404, 'Unknown action.')
  }

  // The only check made before any network call.
  const token = bearerToken(request)

  if (!token) {
    return fail(401, 'Sign in to Studio to use this action.')
  }

  // Authorised before the body is read, so an unauthenticated caller learns nothing about what the route accepts.
  const auth = await authorizeStudioRequest(token)

  if (!auth.ok) {
    return fail(auth.status, auth.error)
  }

  const body = (await request.json().catch(() => null)) as { issueId?: unknown } | null
  const issueId = parseIssueId(body?.issueId)

  if (!issueId) {
    return fail(400, 'Missing or invalid issueId.')
  }

  try {
    const result = await runNewsletterAction(action, issueId, auth.user)

    return Response.json({ ok: true, ...result })
  } catch (error) {
    return failed(action, issueId, error)
  }
}

/** Logs a failure like forms' failed(): status, code and message only, never the token or an address. */
function failed(action: string, issueId: string, error: unknown) {
  const context = `[newsletter] ${action} ${issueId}`

  if (error instanceof NewsletterActionError) {
    console.error(`${context}: ${error.status} ${error.logMessage}`)
    return fail(error.status, error.message)
  }

  if (error instanceof BrevoError) {
    console.error(`${context}: Brevo ${error.status} ${error.code ?? ''} ${error.message}`)
    return fail(502, `Brevo refused the request: ${error.message}`)
  }

  console.error(`${context}:`, error instanceof Error ? error.message : error)
  return fail(500, 'Something went wrong. Check the issue status before trying again.')
}
