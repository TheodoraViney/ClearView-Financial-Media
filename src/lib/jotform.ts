import 'server-only'

/**
 * Minimal Jotform REST client on plain fetch, no SDK. The client's account is Jotform Enterprise, so the API answers
 * on its own domain; api.jotform.com and eu-api.jotform.com refuse the key (401, checked 2026-11-18).
 * Server only: the key is the account admin's.
 */
const BASE_URL = 'https://clearviewpublishing.jotform.com/API'
const TIMEOUT_MS = 10_000

export class JotformError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message)
    this.name = 'JotformError'
  }
}

function apiKey() {
  const key = process.env.JOTFORM_API_KEY

  if (!key) {
    throw new Error('Missing environment variable: JOTFORM_API_KEY')
  }

  return key
}

/**
 * One request to the Jotform API; answers its `content`. Jotform wraps every answer as `{ responseCode, message,
 * content }` and can report a failure in `responseCode` with HTTP 200, so both are checked. Throws JotformError.
 */
async function jotformFetch<T>(path: string, init: { method?: string; form?: URLSearchParams } = {}): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`, {
    method: init.method ?? 'GET',
    headers: {
      APIKEY: apiKey(),
      accept: 'application/json',
      ...(init.form && { 'content-type': 'application/x-www-form-urlencoded' }),
    },
    body: init.form?.toString(),
    cache: 'no-store',
    signal: AbortSignal.timeout(TIMEOUT_MS),
  })

  const body = (await response.json().catch(() => null)) as {
    responseCode?: number
    message?: unknown
    content?: T
  } | null
  const code = typeof body?.responseCode === 'number' ? body.responseCode : response.status

  if (!response.ok || code < 200 || code >= 300) {
    // Jotform's message names the problem (key, form, limit); it never quotes submitted values.
    throw new JotformError(code, typeof body?.message === 'string' ? body.message : `Jotform request failed: ${code}`)
  }

  return body?.content as T
}

/**
 * Stores one submission on the form; answers its id ('' when Jotform leaves it out). Jotform sends no notification
 * email for an API submission (Jotform support, 2026-02-28 and 2026-03-27), so the caller emails the team itself.
 * `params` are the form-encoded parameters by full name, e.g. `submission[5_first]`.
 */
export async function createSubmission(formId: string, params: Record<string, string>): Promise<string> {
  const form = new URLSearchParams(params)

  const content = await jotformFetch<{ submissionID?: unknown }>(`/form/${encodeURIComponent(formId)}/submissions`, {
    method: 'POST',
    form,
  })

  return typeof content?.submissionID === 'string' || typeof content?.submissionID === 'number'
    ? String(content.submissionID)
    : ''
}

/** What the form's own notification emails say, as the client set them up in Jotform. */
export type JotformNotification = {
  /** The form title, trimmed. */
  title: string
  /** Every address of the form's enabled notifications, lowercased, without repeats. */
  recipients: string[]
  /** The first enabled notification's subject template, e.g. `Re: {form_title} - {fullName}`; null when none. */
  subject: string | null
}

// A plain address, as the recipients field holds them.
const ADDRESS = /^[^\s@,;<>"']+@[^\s@,;<>"']+\.[^\s@,;<>"']{2,}$/

/**
 * The form's notifications from GET /form/{id}/properties, read at request time so the client keeps managing the
 * recipients in Jotform. Only `type: notification` entries that are not disabled count; autoresponders (to the
 * visitor) are skipped. `to` holds comma-separated addresses.
 */
export async function getFormNotification(formId: string): Promise<JotformNotification> {
  const content = await jotformFetch<{ title?: unknown; emails?: unknown }>(
    `/form/${encodeURIComponent(formId)}/properties`,
  )

  // An array in every answer seen; an object keyed by index is read the same.
  const emails = (
    Array.isArray(content?.emails) ? content.emails : Object.values((content?.emails as object | null) ?? {})
  ) as Array<{ type?: unknown; disabled?: unknown; to?: unknown; subject?: unknown }>
  const notifications = emails.filter((email) => email?.type === 'notification' && String(email.disabled ?? '0') !== '1')

  const recipients = new Set<string>()

  for (const email of notifications) {
    for (const address of typeof email.to === 'string' ? email.to.split(/[,;]/) : []) {
      const value = address.trim().toLowerCase()

      if (ADDRESS.test(value)) {
        recipients.add(value)
      }
    }
  }

  const subject = notifications.find((email) => typeof email.subject === 'string' && email.subject.trim())?.subject

  return {
    title: typeof content?.title === 'string' ? content.title.trim() : '',
    recipients: [...recipients],
    subject: typeof subject === 'string' ? subject.trim() : null,
  }
}
