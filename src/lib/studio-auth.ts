import 'server-only'

import { apiVersion, projectId } from '@/sanity/env'

/**
 * Authorises a request sent from Studio by a signed-in editor.
 *
 * Studio sends the user's own Sanity token as `Authorization: Bearer <token>`. The server asks Sanity who that is
 * (`GET /users/me`, the same call Studio makes at login) and allows only the project roles below. The token is used
 * for that one call and is never logged or stored.
 */

const ALLOWED_ROLES = new Set(['administrator', 'editor'])

const TIMEOUT_MS = 5_000

export type StudioUser = {
  id: string
  /** Absent for some login providers; callers that need an address must check. */
  email: string | null
  roles: string[]
}

export type StudioAuthResult =
  | { ok: true; user: StudioUser }
  | { ok: false; status: 401 | 403 | 502; error: string }

// The fields of the /users/me answer this helper reads. `roles` holds the project roles (`{ name, title }`);
// `role` is the deprecated single-role string, read only when `roles` is missing.
type UsersMeResponse = {
  id?: unknown
  email?: unknown
  role?: unknown
  roles?: Array<{ name?: unknown }>
}

/** The bearer token, or null when the header is missing or malformed. */
export function bearerToken(request: Request): string | null {
  const match = /^Bearer\s+(\S+)$/i.exec(request.headers.get('authorization') ?? '')

  return match ? match[1] : null
}

export async function authorizeStudioRequest(token: string): Promise<StudioAuthResult> {
  let response: Response

  try {
    response = await fetch(`https://${projectId}.api.sanity.io/v${apiVersion}/users/me`, {
      headers: { authorization: `Bearer ${token}`, accept: 'application/json' },
      cache: 'no-store',
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })
  } catch (error) {
    console.error('[studio-auth] users/me unreachable:', error instanceof Error ? error.message : error)
    return { ok: false, status: 502, error: 'Could not reach Sanity to check your login. Try again.' }
  }

  if (response.status === 401 || response.status === 403) {
    return { ok: false, status: 401, error: 'Your Studio login has expired. Reload Studio and try again.' }
  }

  if (!response.ok) {
    console.error(`[studio-auth] users/me answered ${response.status}`)
    return { ok: false, status: 502, error: 'Could not check your login with Sanity. Try again.' }
  }

  const me = (await response.json().catch(() => ({}))) as UsersMeResponse

  // An unknown or anonymous token can answer 200 with no user; Studio itself treats a missing id as logged out.
  if (typeof me.id !== 'string' || !me.id) {
    return { ok: false, status: 401, error: 'Your Studio login has expired. Reload Studio and try again.' }
  }

  const roles = Array.isArray(me.roles)
    ? me.roles.map((role) => role?.name).filter((name): name is string => typeof name === 'string')
    : typeof me.role === 'string'
      ? [me.role]
      : []

  if (!roles.some((role) => ALLOWED_ROLES.has(role))) {
    return { ok: false, status: 403, error: 'Only editors and administrators can send newsletters.' }
  }

  return {
    ok: true,
    user: { id: me.id, email: typeof me.email === 'string' && me.email ? me.email : null, roles },
  }
}
