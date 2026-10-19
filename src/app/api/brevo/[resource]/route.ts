import type { NextRequest } from 'next/server'

import {
  BrevoError,
  listBooleanAttributes,
  listConfirmationTemplates,
  listContactLists,
  listSegments,
  listSenders,
} from '@/lib/brevo'
import { authorizeStudioRequest, bearerToken } from '@/lib/studio-auth'

/**
 * GET /api/brevo/{lists|segments|templates|senders|attributes}, called from Studio's Brevo pickers with the signed-in user's Sanity token
 * as a bearer token. Read only: it lists what an editor may choose, never changes anything in Brevo.
 *
 * Answers `{ ok: true, items }` or `{ ok: false, error }`. The error is written for editors.
 * /api is outside the proxy matcher, so the route is reachable on every brand host and from Studio at /studio.
 */

// Node.js runtime, the default. An explicit `runtime` export is rejected while cacheComponents is on.

const LOADERS = {
  lists: listContactLists,
  segments: listSegments,
  templates: listConfirmationTemplates,
  senders: listSenders,
  attributes: listBooleanAttributes,
} as const

type Resource = keyof typeof LOADERS

const isResource = (value: string): value is Resource => Object.hasOwn(LOADERS, value)

// Account data behind a login: never cached by a browser or a CDN.
const NO_STORE = { 'cache-control': 'no-store' }

const fail = (status: number, error: string) => Response.json({ ok: false, error }, { status, headers: NO_STORE })

export async function GET(request: NextRequest, context: { params: Promise<{ resource: string }> }) {
  const { resource } = await context.params

  if (!isResource(resource)) {
    return fail(404, 'Unknown resource.')
  }

  const token = bearerToken(request)

  if (!token) {
    return fail(401, 'Sign in to Studio to load Brevo options.')
  }

  const auth = await authorizeStudioRequest(token)

  if (!auth.ok) {
    // studio-auth's 403 text is about sending newsletters; this route only lists options.
    return fail(auth.status, auth.status === 403 ? 'Only editors and administrators can load Brevo options.' : auth.error)
  }

  try {
    const items = await LOADERS[resource]()

    return Response.json({ ok: true, items }, { headers: NO_STORE })
  } catch (error) {
    return failed(resource, error)
  }
}

/** Logs a failure like the newsletter route: status, code and message only, never the token or the API key. */
function failed(resource: Resource, error: unknown) {
  const context = `[brevo] ${resource}`

  if (error instanceof BrevoError) {
    console.error(`${context}: Brevo ${error.status} ${error.code ?? ''} ${error.message}`)
    return fail(502, `Brevo refused the request: ${error.message}`)
  }

  console.error(`${context}:`, error instanceof Error ? error.message : error)
  return fail(500, 'Could not load the options from Brevo. Try again.')
}
