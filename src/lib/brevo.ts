import 'server-only'

/**
 * Minimal Brevo REST client on plain fetch. The official SDK (@getbrevo/brevo) declares no licence,
 * so it must not be installed: the contract requires a clean licence report at handover.
 * Server only: the key gives full access to the client's live Brevo account.
 */
const BASE_URL = 'https://api.brevo.com/v3'
const TIMEOUT_MS = 10_000

export class BrevoError extends Error {
  constructor(
    readonly status: number,
    readonly code: string | undefined,
    message: string,
  ) {
    super(message)
    this.name = 'BrevoError'
  }
}

function apiKey() {
  const key = process.env.BREVO_API_KEY

  if (!key) {
    throw new Error('Missing environment variable: BREVO_API_KEY')
  }

  return key
}

/** One request to the Brevo API. Throws BrevoError on a non-2xx answer; returns undefined on 204. */
export async function brevoFetch<T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`, {
    method: init.method ?? 'GET',
    headers: {
      'api-key': apiKey(),
      accept: 'application/json',
      ...(init.body === undefined ? {} : { 'content-type': 'application/json' }),
    },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
    cache: 'no-store',
    signal: AbortSignal.timeout(TIMEOUT_MS),
  })

  if (!response.ok) {
    const error = (await response.json().catch(() => ({}))) as { code?: string; message?: string }

    throw new BrevoError(response.status, error.code, error.message ?? `Brevo request failed: ${response.status}`)
  }

  // 204 and some 2xx answers have no body; parse only what is there.
  const body = await response.text()

  return (body ? JSON.parse(body) : undefined) as T
}

/** Contact attribute values as Brevo accepts them; a string array is for multiple-choice attributes. */
export type BrevoAttributes = Record<string, string | number | boolean | string[]>

/**
 * Starts double opt-in: Brevo emails the confirmation template and adds the contact to the lists only after
 * the click, then sends the reader to redirectionUrl. 201 for a new contact, 204 for an existing one.
 */
export async function subscribeWithDoubleOptIn({
  email,
  attributes,
  listIds,
  templateId,
  redirectionUrl,
}: {
  email: string
  attributes?: BrevoAttributes
  listIds: number[]
  templateId: number
  redirectionUrl: string
}): Promise<void> {
  await brevoFetch('/contacts/doubleOptinConfirmation', {
    method: 'POST',
    body: { email, attributes, includeListIds: listIds, templateId, redirectionUrl },
  })
}

/**
 * Creates the contact or updates an existing one, adding it to the lists straight away with no confirmation.
 * For leads and downloads, not newsletter consent. 201 created, 204 updated.
 */
export async function upsertContact({
  email,
  attributes,
  listIds,
}: {
  email: string
  attributes?: BrevoAttributes
  listIds: number[]
}): Promise<void> {
  await brevoFetch('/contacts', {
    method: 'POST',
    body: { email, attributes, listIds, updateEnabled: true },
  })
}
