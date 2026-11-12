import 'server-only'

import { createSign } from 'node:crypto'

import { GAM_NETWORK_CODE } from '@/lib/gam'

/**
 * Read-only Google Ad Manager REST API client on plain fetch, used to check the unit codes typed into Brand settings.
 * It signs in as the Publisher's service account (GAM_SERVICE_ACCOUNT_KEY, the JSON key from their Google Cloud
 * project) with the read-only scope, so it can list ad units and change nothing.
 *
 * The network's API quota is 2 requests a second, shared with every other app on the Publisher's network, so answers
 * are cached here for a few minutes and the Studio input only asks once the editor stops typing.
 */
const TOKEN_URL = 'https://oauth2.googleapis.com/token'
const API_URL = 'https://admanager.googleapis.com/v1'
const SCOPE = 'https://www.googleapis.com/auth/admanager.readonly'
const TIMEOUT_MS = 10_000
const CACHE_MS = 5 * 60_000

export type AdUnitStatus = 'ACTIVE' | 'INACTIVE' | 'ARCHIVED'

export type AdUnit = {
  /** The Name column in GAM. */
  name: string
  code: string
  status: AdUnitStatus
  /** The creative sizes the unit accepts, e.g. "728x90". */
  sizes: string[]
}

export class GamApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message)
    this.name = 'GamApiError'
  }
}

type ServiceAccountKey = { client_email: string; private_key: string }

/** The service account key, or null when the variable is unset. Throws on a value that is not the JSON key. */
function serviceAccountKey(): ServiceAccountKey | null {
  const raw = process.env.GAM_SERVICE_ACCOUNT_KEY?.trim()

  if (!raw) {
    return null
  }

  const key = JSON.parse(raw) as Partial<ServiceAccountKey>

  if (typeof key.client_email !== 'string' || typeof key.private_key !== 'string') {
    throw new Error('GAM_SERVICE_ACCOUNT_KEY is not a service account JSON key')
  }

  return { client_email: key.client_email, private_key: key.private_key }
}

/** Whether the server can check codes: the network code and the service account key are both set. */
export function isGamApiConfigured(): boolean {
  return Boolean(GAM_NETWORK_CODE && process.env.GAM_SERVICE_ACCOUNT_KEY?.trim())
}

let cachedToken: { value: string; expiresAt: number } | null = null

/** An access token from the service account's signed JWT (RFC 7523), reused until a minute before it expires. */
async function accessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) {
    return cachedToken.value
  }

  const key = serviceAccountKey()

  if (!key) {
    throw new Error('Missing environment variable: GAM_SERVICE_ACCOUNT_KEY')
  }

  const now = Math.floor(Date.now() / 1000)
  const encode = (part: object) => Buffer.from(JSON.stringify(part)).toString('base64url')
  const unsigned = `${encode({ alg: 'RS256', typ: 'JWT' })}.${encode({
    iss: key.client_email,
    scope: SCOPE,
    aud: TOKEN_URL,
    iat: now,
    exp: now + 3600,
  })}`
  const signature = createSign('RSA-SHA256').update(unsigned).sign(key.private_key).toString('base64url')

  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: `${unsigned}.${signature}`,
    }),
    cache: 'no-store',
    signal: AbortSignal.timeout(TIMEOUT_MS),
  })
  const body = (await response.json().catch(() => ({}))) as {
    access_token?: string
    expires_in?: number
    error_description?: string
  }

  if (!response.ok || !body.access_token) {
    throw new GamApiError(response.status, body.error_description ?? 'Google refused the service account key')
  }

  cachedToken = { value: body.access_token, expiresAt: Date.now() + (body.expires_in ?? 3600) * 1000 }

  return cachedToken.value
}

type ApiAdUnit = {
  displayName?: string
  adUnitCode?: string
  status?: AdUnitStatus
  adUnitSizes?: Array<{ size?: { width?: number; height?: number } }>
}

const toAdUnit = (unit: ApiAdUnit, code: string): AdUnit => ({
  name: unit.displayName || code,
  code,
  status: unit.status ?? 'ACTIVE',
  sizes: (unit.adUnitSizes ?? []).flatMap(({ size }) => (size?.width && size.height ? [`${size.width}x${size.height}`] : [])),
})

/** `networks/{code}/adUnits` matching `filter` (https://developers.google.com/ad-manager/api/beta/filters). */
async function listAdUnits(filter: string, pageSize: number) {
  const query = new URLSearchParams({ filter, pageSize: String(pageSize) })
  const response = await fetch(`${API_URL}/networks/${GAM_NETWORK_CODE}/adUnits?${query}`, {
    headers: { authorization: `Bearer ${await accessToken()}`, accept: 'application/json' },
    cache: 'no-store',
    signal: AbortSignal.timeout(TIMEOUT_MS),
  })
  const body = (await response.json().catch(() => ({}))) as {
    adUnits?: ApiAdUnit[]
    error?: { message?: string }
  }

  if (!response.ok) {
    throw new GamApiError(response.status, body.error?.message ?? `Ad Manager answered ${response.status}`)
  }

  return body.adUnits ?? []
}

const units = new Map<string, { unit: AdUnit | null; expiresAt: number }>()

/** The ad unit with this code in the Publisher's network, in any status, or null when there is none. Case-sensitive. */
export async function findAdUnit(code: string): Promise<AdUnit | null> {
  const cached = units.get(code)

  if (cached && cached.expiresAt > Date.now()) {
    return cached.unit
  }

  // The caller has checked the code against isAdUnitCode, so it holds no quote that could break out of the filter.
  const found = await listAdUnits(`adUnitCode = "${code}"`, 1)
  const match = found.find((candidate) => candidate.adUnitCode === code)
  const unit = match ? toAdUnit(match, code) : null

  units.set(code, { unit, expiresAt: Date.now() + CACHE_MS })

  return unit
}
