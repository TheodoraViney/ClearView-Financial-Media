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
    /** The parsed error body, e.g. the refused addresses on a failed campaign test. */
    readonly details?: Record<string, unknown>,
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
    const error = (await response.json().catch(() => ({}))) as { code?: string; message?: string } & Record<
      string,
      unknown
    >

    throw new BrevoError(
      response.status,
      error.code,
      error.message ?? `Brevo request failed: ${response.status}`,
      error,
    )
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

/**
 * Campaign sender. Brevo takes an email (with an optional name) or a sender id, never both; the address must be a
 * sender in the account. With an id, Brevo uses that sender's own name and address.
 */
export type BrevoCampaignSender = { email: string; name?: string } | { id: number }

/** Fields shared by create and update. scheduledAt is ISO 8601 with an offset, e.g. 2026-10-10T06:00:00+01:00. */
export type EmailCampaignFields = {
  name: string
  subject: string
  sender: BrevoCampaignSender
  /** Over 10 characters and under 1 MB. Link the unsubscribe page with href="{{ unsubscribe }}", or Brevo appends its own footer. */
  htmlContent: string
  /**
   * Newsletter issues always go to one segment. Brevo's updateEmailCampaign says a campaign "should only be updated
   * with listIds if listIds were used to create it" (and the same for segmentIds), so a campaign never switches kind;
   * ensureCampaign refuses one created for a list.
   */
  recipients: { segmentIds: number[] }
  scheduledAt?: string
}

/** Campaign status as GET /emailCampaigns/{id} reports it. queued means scheduled. */
export type EmailCampaignStatus =
  | 'draft'
  | 'sent'
  | 'archive'
  | 'queued'
  | 'suspended'
  | 'in_process'
  | 'in_review'
  | 'cancelling'
  | 'cancelled'

/**
 * Statuses in which a campaign may still be edited, scheduled or sent; a queued (scheduled) one is updated in place,
 * since Brevo modifies only draft or scheduled campaigns. Anything else (sent, in_process, in_review, archive,
 * suspended, cancelling, cancelled) may already have gone out, so the route refuses. One exception lives in
 * ensureCampaign (src/lib/newsletter-sending.ts): a suspended campaign of an issue we cancelled, with nothing sent, is
 * treated as editable again. The main double-send guard stays: an issue with a campaign id is updated, never given a second campaign.
 */
export const EMAIL_CAMPAIGN_EDITABLE_STATUSES: readonly EmailCampaignStatus[] = ['draft', 'queued']

export const isEmailCampaignEditable = (status: EmailCampaignStatus) => EMAIL_CAMPAIGN_EDITABLE_STATUSES.includes(status)

export type EmailCampaign = {
  id: number
  name: string
  /** Absent on A/B test campaigns. */
  subject?: string
  status: EmailCampaignStatus
  /** UTC, YYYY-MM-DDTHH:mm:ss.SSSZ. */
  scheduledAt?: string
  /** UTC; present only once status is sent. */
  sentDate?: string
  /** statistics.globalStats.sent: emails Brevo has sent for this campaign so far. 0 when Brevo reports none. */
  sentCount: number
  /** segments and excludedSegments are optional in Brevo's getCampaignRecipients; normalised to [] here. */
  recipients: { lists: number[]; exclusionLists: number[]; segments: number[]; excludedSegments: number[] }
}

/** Creates a classic email campaign, as a draft unless scheduledAt is set. 201 with the id. */
export async function createEmailCampaign({
  name,
  subject,
  sender,
  htmlContent,
  recipients,
  scheduledAt,
}: EmailCampaignFields): Promise<{ id: number }> {
  return brevoFetch<{ id: number }>('/emailCampaigns', {
    method: 'POST',
    body: { name, subject, sender, htmlContent, recipients, scheduledAt },
  })
}

/**
 * Updates a draft or scheduled campaign; a sent or sending one answers 400 (campaign_sent, campaign_processing).
 * Setting scheduledAt schedules or reschedules it. 204.
 */
export async function updateEmailCampaign(id: number, fields: Partial<EmailCampaignFields>): Promise<void> {
  await brevoFetch(`/emailCampaigns/${id}`, { method: 'PUT', body: fields })
}

/**
 * Sends the campaign as a test to the given addresses, or to the account's test list when empty. Brevo caps tests
 * at 50 a day. 204; on 400 the refused addresses are in the BrevoError's details (blackListedEmails, unexistingEmails,
 * withoutListEmails).
 */
export async function sendEmailCampaignTest(id: number, emailTo: string[]): Promise<void> {
  await brevoFetch(`/emailCampaigns/${id}/sendTest`, { method: 'POST', body: { emailTo } })
}

/** Sends the campaign to its recipients immediately. 204; 400 when it cannot be sent, 402 when credits run out. */
export async function sendEmailCampaignNow(id: number): Promise<void> {
  await brevoFetch(`/emailCampaigns/${id}/sendNow`, { method: 'POST' })
}

/**
 * Takes a scheduled campaign out of the queue by suspending it (the pause button in Brevo → Campaigns). 204.
 * Verified 2026-10-12 on a test campaign: Brevo refuses 'draft' for a scheduled campaign ("draft is an invalid
 * status for scheduled campaign"); 'suspended' takes it out of the queue with nothing sent, and an update with a new
 * scheduledAt then puts it back in the queue.
 */
export async function unscheduleEmailCampaign(id: number): Promise<void> {
  await brevoFetch(`/emailCampaigns/${id}/status`, { method: 'PUT', body: { status: 'suspended' } })
}

/** One campaign without its HTML, with its global statistics only (for the sent count). 404 when the id is unknown. */
export async function getEmailCampaign(id: number): Promise<EmailCampaign> {
  const campaign = await brevoFetch<
    Omit<EmailCampaign, 'recipients'> & {
      recipients?: { lists?: number[]; exclusionLists?: number[]; segments?: number[]; excludedSegments?: number[] }
      // Required in Brevo's schema, but every stat inside is nullable, so all of it is treated as optional.
      statistics?: { globalStats?: { sent?: number | null } | null } | null
    }
  >(`/emailCampaigns/${id}?excludeHtmlContent=true&statistics=globalStats`)

  return {
    id: campaign.id,
    name: campaign.name,
    subject: campaign.subject,
    status: campaign.status,
    scheduledAt: campaign.scheduledAt,
    sentDate: campaign.sentDate,
    sentCount: campaign.statistics?.globalStats?.sent ?? 0,
    recipients: {
      lists: campaign.recipients?.lists ?? [],
      exclusionLists: campaign.recipients?.exclusionLists ?? [],
      segments: campaign.recipients?.segments ?? [],
      excludedSegments: campaign.recipients?.excludedSegments ?? [],
    },
  }
}

// ---------------------------------------------------------------------------------------------------------------
// Read-only lookups for the Studio pickers (GET /api/brevo/{lists|segments|templates|senders|attributes}). Shapes
// verified on the live account on 2026-10-15.

/** Stops a runaway pagination loop; the account has 80 lists and 7 templates today. */
const MAX_ITEMS = 2_000

/** Fetches every page of a GET collection with limit and offset until a short page, the total or MAX_ITEMS. */
async function fetchAllPages<T>(
  path: (limit: number, offset: number) => string,
  pageSize: number,
  read: (page: unknown) => { items: T[]; count?: number },
): Promise<T[]> {
  const all: T[] = []

  while (all.length < MAX_ITEMS) {
    const { items, count } = read(await brevoFetch<unknown>(path(pageSize, all.length)))

    all.push(...items)

    if (items.length < pageSize || (count !== undefined && all.length >= count)) {
      break
    }
  }

  return all.slice(0, MAX_ITEMS)
}

const byName = <T extends { name: string }>(a: T, b: T) => a.name.localeCompare(b.name, 'en', { sensitivity: 'base' })

export type BrevoContactList = {
  id: number
  name: string
  /** uniqueSubscribers. Brevo deprecated totalSubscribers, which now always answers 0. */
  subscribers: number
}

/** Every contact list, sorted by name. Brevo caps the page at 50. */
export async function listContactLists(): Promise<BrevoContactList[]> {
  const lists = await fetchAllPages(
    (limit, offset) => `/contacts/lists?limit=${limit}&offset=${offset}&sort=asc`,
    50,
    (page) => {
      // An account with no lists answers without the `lists` key.
      const { lists = [], count } = (page ?? {}) as {
        lists?: Array<{ id: number; name: string; uniqueSubscribers?: number }>
        count?: number
      }

      return { items: lists, count }
    },
  )

  return lists
    .map(({ id, name, uniqueSubscribers }) => ({ id, name, subscribers: uniqueSubscribers ?? 0 }))
    .sort(byName)
}

export type BrevoTemplate = { id: number; name: string; subject: string }

/**
 * Active transactional templates tagged `optin`, the ones POST /contacts/doubleOptinConfirmation accepts as the
 * confirmation email. Brevo's own default is tagged `optin`; templates without that tag are refused there. `tag` is
 * one string, empty when unset. The list endpoint has no option to leave out htmlContent, so it is dropped here.
 */
export async function listConfirmationTemplates(): Promise<BrevoTemplate[]> {
  const templates = await fetchAllPages(
    (limit, offset) => `/smtp/templates?templateStatus=true&limit=${limit}&offset=${offset}&sort=asc`,
    100,
    (page) => {
      const { templates = [], count } = (page ?? {}) as {
        templates?: Array<{ id: number; name: string; subject?: string; tag?: string; isActive?: boolean }>
        count?: number
      }

      return { items: templates, count }
    },
  )

  return templates
    .filter((template) => template.isActive !== false && isOptinTag(template.tag))
    .map(({ id, name, subject }) => ({ id, name, subject: subject ?? '' }))
    .sort(byName)
}

const isOptinTag = (tag: string | undefined) => tag?.trim().toLowerCase() === 'optin'

export type BrevoSenderOption = { id: number; name: string; email: string }

/** Active senders, the only ones a campaign can go out from, sorted by name. Not paginated by Brevo. */
export async function listSenders(): Promise<BrevoSenderOption[]> {
  const { senders = [] } = await brevoFetch<{
    senders?: Array<{ id: number; name: string; email: string; active?: boolean }>
  }>('/senders')

  return senders
    .filter((sender) => sender.active !== false)
    .map(({ id, name, email }) => ({ id, name, email }))
    .sort(byName)
}

export type BrevoSegment = { id: number; name: string; category: string }

/** Every contact segment, sorted by name. Brevo calls the fields segmentName and categoryName; the page caps at 50. */
export async function listSegments(): Promise<BrevoSegment[]> {
  const segments = await fetchAllPages(
    (limit, offset) => `/contacts/segments?limit=${limit}&offset=${offset}&sort=asc`,
    50,
    (page) => {
      const { segments = [], count } = (page ?? {}) as {
        segments?: Array<{ id: number; segmentName?: string; categoryName?: string }>
        count?: number
      }

      return { items: segments, count }
    },
  )

  return segments
    .map(({ id, segmentName, categoryName }) => ({ id, name: segmentName ?? '', category: categoryName ?? '' }))
    .sort(byName)
}

export type BrevoAttribute = { name: string }

// Consent flags record a legal opt-in of their own; a signup tick box must never set them.
const CONSENT_ATTRIBUTES = new Set(['GDPR_CONSENT', 'SMS_CONSENT', 'WHATSAPP_CONSENT', 'OPT_IN', 'MARKETING_SUBSCRIBER'])

/**
 * The account's yes/no contact attributes (category normal, type boolean), such as WB_NEWSLETTER, sorted by name,
 * without the consent flags. The ones a signup option can set. Not paginated by Brevo. Attributes have no id; the name is the key.
 */
export async function listBooleanAttributes(): Promise<BrevoAttribute[]> {
  const { attributes = [] } = await brevoFetch<{
    attributes?: Array<{ name: string; category?: string; type?: string }>
  }>('/contacts/attributes')

  return attributes
    .filter(
      (attribute) =>
        attribute.category === 'normal' && attribute.type === 'boolean' && !CONSENT_ATTRIBUTES.has(attribute.name),
    )
    .map(({ name }) => ({ name }))
    .sort(byName)
}
