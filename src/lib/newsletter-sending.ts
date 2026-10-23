import 'server-only'

import { brandDocumentId, BRANDS, isEditorialBrandKey } from '@/brands'
import {
  NEWSLETTER_EMAIL_QUERY,
  NEWSLETTER_ISSUE_EXISTING_IDS_QUERY,
  NEWSLETTER_ISSUE_LOCK_HOLDERS_QUERY,
  NEWSLETTER_ISSUE_VERSIONS_QUERY,
} from '@/sanity/queries'
import type { NEWSLETTER_ISSUE_VERSIONS_QUERY_RESULT } from '@/sanity/types'
import { writeClient } from '@/sanity/write-client'

import {
  BrevoError,
  createEmailCampaign,
  type EmailCampaignFields,
  getEmailCampaign,
  isEmailCampaignEditable,
  sendEmailCampaignNow,
  sendEmailCampaignTest,
  unscheduleEmailCampaign,
  updateEmailCampaign,
} from './brevo'
import { renderNewsletterEmail } from './newsletter-email'
import { isLockedStatus } from './newsletter-status'
import type { StudioUser } from './studio-auth'

/**
 * Test, send, schedule, cancel and sync for a newsletter issue, called by POST /api/newsletter/[action].
 *
 * Every action but sync takes a lock on the issue before any Brevo call, so two clicks (or two editors) never run at once,
 * and writes its result to the published issue and its draft together, so Studio's lock logic reads the same status
 * from either version.
 */

export const NEWSLETTER_ACTIONS = ['test', 'send', 'schedule', 'cancel', 'sync'] as const

export type NewsletterAction = (typeof NEWSLETTER_ACTIONS)[number]

export const isNewsletterAction = (value: string): value is NewsletterAction =>
  (NEWSLETTER_ACTIONS as readonly string[]).includes(value)

export type IssueStatus = 'draft' | 'scheduled' | 'sent' | 'cancelled'

export type NewsletterActionResult = {
  status: IssueStatus
  campaignId: number | null
  message: string
}

/** An editor-facing refusal with its HTTP status. The message is shown in Studio as is. */
export class NewsletterActionError extends Error {
  constructor(
    readonly status: 400 | 404 | 409 | 502,
    message: string,
    /** What the server log gets instead of the message, when the message names a person (an email address). */
    readonly logMessage: string = message,
  ) {
    super(message)
    this.name = 'NewsletterActionError'
  }
}

// A lock older than this belongs to a request that died (timeout, crash) before its finally ran. Above the route's
// maxDuration, so a live request never loses its lock.
const LOCK_STALE_MS = 2 * 60_000

// Brevo needs time to queue a campaign; a time closer than this could pass before the campaign is in place.
const MIN_SCHEDULE_LEAD_MS = 5 * 60_000

// While a send request is younger than this and Brevo still reports a draft, the outcome of sendNow is unknown
// (in flight, or lost on a timeout), so Send and Schedule refuse rather than risk a second send.
const SEND_REQUEST_PENDING_MS = 10 * 60_000

type IssueVersion = NEWSLETTER_ISSUE_VERSIONS_QUERY_RESULT[number]

/** The Brevo segment an issue goes to. */
type Segment = { id: number; name: string | null }

/** "the segment "WB readers"", for editor messages. */
const describeSegment = (segment: Segment) =>
  segment.name ? `the segment "${segment.name}"` : `segment #${segment.id}`

type IssueFields = Partial<{ status: IssueStatus; sentAt: string; brevoCampaignId: number; sendRequestedAt: string }>

/**
 * Test mode: anything but NEXT_PUBLIC_SITE_ENV=production, missing included. Staging and development share the
 * client's live Brevo account, so there every campaign name starts with [TEST] and stands out in the client's Brevo.
 * Recipients are the issue's own segment in every environment: a test issue picks a small test segment.
 */
const isTestMode = () => process.env.NEXT_PUBLIC_SITE_ENV !== 'production'

const DRAFT_PREFIX = 'drafts.'

/**
 * The published id from a request's issueId, or null when it is not one. Accepts an optional leading `drafts.`
 * (stripped); no other dot, since the project never uses dotted ids (README, content model conventions).
 */
export function parseIssueId(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null
  }

  const id = value.startsWith(DRAFT_PREFIX) ? value.slice(DRAFT_PREFIX.length) : value

  return /^[A-Za-z0-9_-]{1,128}$/.test(id) ? id : null
}

export async function runNewsletterAction(
  action: NewsletterAction,
  issueId: string,
  user: StudioUser,
): Promise<NewsletterActionResult> {
  const sanity = writeClient()
  const draftId = `${DRAFT_PREFIX}${issueId}`

  const versions = await sanity.fetch(NEWSLETTER_ISSUE_VERSIONS_QUERY, { id: issueId, draftId }, { cache: 'no-store' })
  const published = versions.find((version) => version._id === issueId) ?? null
  const draft = versions.find((version) => version._id === draftId) ?? null

  if (!published && !draft) {
    throw new NewsletterActionError(404, 'Newsletter issue not found.')
  }

  // Read-only on Brevo, and its one possible write (Brevo says sent) is idempotent, so no lock: opening an issue in
  // Studio must not block or be blocked by a running action.
  if (action === 'sync') {
    return sync(issueId, published, draft)
  }

  const lock = await takeLock(issueId, [published, draft])

  try {
    switch (action) {
      case 'test':
        return await sendTest(issueId, published, draft, user)
      case 'send':
      case 'schedule':
        return await sendOrSchedule(action, issueId, published, draft)
      case 'cancel':
        return await cancel(issueId, published, draft)
    }
  } finally {
    await releaseLock(issueId, lock)
  }
}

/**
 * Sets sendingStartedAt on every existing version in one transaction pinned to the revisions just read. A second
 * request either sees a fresh lock (409) or, if it read before the first wrote, fails the revision check (409).
 */
async function takeLock(issueId: string, versions: Array<IssueVersion | null>): Promise<string> {
  const existing = versions.filter((version): version is IssueVersion => version !== null)
  const now = Date.now()

  const held = existing.some(
    (version) => version.sendingStartedAt && now - new Date(version.sendingStartedAt).getTime() < LOCK_STALE_MS,
  )

  if (held) {
    throw new NewsletterActionError(409, 'Already in progress. Wait a moment and check the issue status.')
  }

  const lock = new Date(now).toISOString()
  const transaction = writeClient().transaction()

  for (const version of existing) {
    transaction.patch(version._id, (patch) => patch.ifRevisionId(version._rev).set({ sendingStartedAt: lock }))
  }

  try {
    await transaction.commit({ visibility: 'sync' })
  } catch (error) {
    if (statusCodeOf(error) === 409) {
      throw new NewsletterActionError(
        409,
        'Already in progress, or the issue changed just now. Wait a moment and try again.',
      )
    }

    throw error
  }

  return lock
}

/** Clears the lock on the versions that still hold this request's value. Logged, never thrown: the action's own result wins. */
async function releaseLock(issueId: string, lock: string) {
  try {
    const sanity = writeClient()
    const holders = await sanity.fetch(
      NEWSLETTER_ISSUE_LOCK_HOLDERS_QUERY,
      { id: issueId, draftId: `${DRAFT_PREFIX}${issueId}`, lock },
      { cache: 'no-store' },
    )

    if (holders.length === 0) {
      return
    }

    // Pinned to the revisions just read, so the unset never lands on a version changed in between (for example one
    // republished from a draft whose own lock value differs). A conflict leaves the lock to go stale.
    const transaction = sanity.transaction()

    for (const { _id, _rev } of holders) {
      transaction.patch(_id, (patch) => patch.ifRevisionId(_rev).unset(['sendingStartedAt']))
    }

    await transaction.commit({ visibility: 'sync' })
  } catch (error) {
    // The lock goes stale after LOCK_STALE_MS, so a failed release only delays the next action.
    console.error(`[newsletter] release lock ${issueId}:`, error instanceof Error ? error.message : error)
  }
}

/** Writes server fields to the published issue and its draft, whichever exist now, in one transaction. */
async function writeIssueFields(issueId: string, fields: IssueFields, unset: Array<keyof IssueFields> = []) {
  const hasSet = Object.keys(fields).length > 0

  if (!hasSet && unset.length === 0) {
    return
  }

  const sanity = writeClient()
  const ids = await sanity.fetch(
    NEWSLETTER_ISSUE_EXISTING_IDS_QUERY,
    { id: issueId, draftId: `${DRAFT_PREFIX}${issueId}` },
    { cache: 'no-store' },
  )

  const transaction = sanity.transaction()

  for (const id of ids) {
    transaction.patch(id, (patch) => {
      const withSet = hasSet ? patch.set(fields) : patch

      return unset.length > 0 ? withSet.unset(unset) : withSet
    })
  }

  await transaction.commit({ visibility: 'sync' })
}

/** Everything a campaign needs from one issue version, checked. Throws a 400 naming what is missing. */
async function buildCampaign(issueId: string, version: IssueVersion, action: 'test' | 'send' | 'schedule') {
  const brand = version.brand

  if (!brand || !isEditorialBrandKey(brand)) {
    throw new NewsletterActionError(400, 'This issue belongs to no publication. Create it inside a publication folder.')
  }

  const subject = version.subject?.trim()

  if (!subject) {
    throw new NewsletterActionError(400, 'Add a subject before sending.')
  }

  // The issue's own segment, from the version being sent, like the subject and posts. Required for a test too, so
  // every campaign is created with its recipients.
  const segment: Segment | null =
    typeof version.segment?.id === 'number' ? { id: version.segment.id, name: version.segment.name ?? null } : null

  if (!segment) {
    throw new NewsletterActionError(400, 'Choose a segment to send to.')
  }

  const postIds = version.postIds ?? []

  if (postIds.length === 0) {
    throw new NewsletterActionError(400, 'Add at least one post before sending.')
  }

  const { brand: settings, posts } = await writeClient().fetch(
    NEWSLETTER_EMAIL_QUERY,
    { brand, brandId: brandDocumentId(brand), postIds },
    { cache: 'no-store' },
  )

  const brandTitle = settings?.title || BRANDS[brand].title
  const senderId = settings?.senderId

  if (!senderId) {
    throw new NewsletterActionError(
      400,
      `Newsletter not configured for ${brandTitle}: choose the sender in Brand settings → Newsletter.`,
    )
  }

  const byId = new Map(posts.map((post) => [post._id, post]))
  const ordered = postIds.flatMap((id) => byId.get(id) ?? [])
  const missing = postIds.length - ordered.length

  if (missing > 0) {
    throw new NewsletterActionError(
      400,
      `${missing} of the posts ${missing === 1 ? 'is' : 'are'} no longer published on ${brandTitle}. Remove ${missing === 1 ? 'it' : 'them'} from the issue.`,
    )
  }

  const fields: EmailCampaignFields = {
    name: `${isTestMode() ? '[TEST] ' : ''}${brandTitle} – ${subject} – ${issueId}`,
    subject,
    // By id: Brevo then uses the sender's current name and verified address, never a stale copy from Sanity.
    sender: { id: senderId },
    htmlContent: renderNewsletterEmail({
      brand,
      brandTitle,
      domain: settings?.domain ?? null,
      brandColor: settings?.brandColor ?? null,
      logo: settings?.logo ?? null,
      copy: settings?.copy ?? null,
      subject,
      date: issueDate(action, version.scheduledAt),
      posts: ordered,
      topBanner: version.topBanner ?? null,
      bottomBanner: version.bottomBanner ?? null,
    }),
    recipients: { segmentIds: [segment.id] },
  }

  return { fields, segment }
}

/**
 * The date under the logo. Schedule: the scheduled day. Send now: today. Test: the scheduled day while it is still
 * ahead, else today, so a test of a stale or past date shows the day it would go out.
 */
function issueDate(action: 'test' | 'send' | 'schedule', scheduledAt: string | null): Date {
  const scheduled = scheduledAt ? new Date(scheduledAt) : null
  const valid = scheduled && !Number.isNaN(scheduled.getTime()) ? scheduled : null

  if (action === 'schedule' && valid) {
    return valid
  }

  return action === 'test' && valid && valid.getTime() > Date.now() ? valid : new Date()
}

/**
 * The issue's Brevo campaign with the given content: updated in place when the issue already has one, created
 * otherwise. A new campaign id is written to the issue before anything else happens, so a retry updates that
 * campaign instead of creating a second one.
 */
async function ensureCampaign(
  action: NewsletterAction,
  issueId: string,
  version: IssueVersion,
  campaignId: number | null,
  fields: EmailCampaignFields,
): Promise<number> {
  if (campaignId) {
    const campaign = await getEmailCampaign(campaignId)

    if (campaign.status === 'sent') {
      await markSent(issueId, campaign.sentDate)
      throw new NewsletterActionError(409, 'Brevo has already sent this issue. Its status is now Sent.')
    }

    // Cancel suspends a queued campaign before Brevo starts it, so a suspended campaign of a cancelled issue was
    // never sent and may be changed again. A campaign suspended any other way (e.g. paused mid-send in Brevo) may
    // be partly sent, so it stays refused, and so does ours whenever Brevo reports any email sent.
    const cancelledByUs =
      campaign.status === 'suspended' && version.status === 'cancelled' && campaign.sentCount === 0

    // An earlier Send reached sendNow but its outcome is unknown, and Brevo has not started: it may still be
    // queuing it. Sending or scheduling again could deliver the issue twice, and a test would rewrite its content.
    // A cancelled issue's campaign stays suspended until Brevo picks up the sendNow, so it counts as not started too.
    if (
      action !== 'cancel' &&
      (campaign.status === 'draft' || cancelledByUs) &&
      version.sendRequestedAt &&
      Date.now() - new Date(version.sendRequestedAt).getTime() < SEND_REQUEST_PENDING_MS
    ) {
      throw new NewsletterActionError(
        409,
        'A send was requested a few minutes ago and Brevo has not started it yet. Use Check status to check the status before trying again.',
      )
    }

    // Brevo has this campaign scheduled while the issue is not: sending now would leave the scheduled send in place.
    if (action === 'send' && campaign.status === 'queued' && version.status !== 'scheduled') {
      throw new NewsletterActionError(409, 'Cancel the scheduled send first.')
    }

    if (!isEmailCampaignEditable(campaign.status) && !cancelledByUs) {
      throw new NewsletterActionError(
        409,
        `The Brevo campaign is ${campaign.status.replace('_', ' ')} and can no longer be changed. Check it in Brevo → Campaigns.`,
      )
    }

    // A test must not rewrite a campaign Brevo has queued: the queued content is what subscribers will get.
    if (action === 'test' && campaign.status === 'queued') {
      throw new NewsletterActionError(409, 'This campaign is scheduled in Brevo. Cancel it before sending a test.')
    }

    // Brevo's updateEmailCampaign says a campaign "should only be updated with listIds if listIds were used to create
    // it", and the same for segmentIds: it cannot be moved from a list to a segment, and an update may leave the old
    // list in place. Issues once could go to a list, so a campaign created that way is refused, never updated.
    if (campaign.recipients.lists.length > 0) {
      throw new NewsletterActionError(
        409,
        "This issue's Brevo campaign was created for a list, and Brevo cannot switch a campaign to a segment. Create a new issue to send to a segment.",
      )
    }

    await updateEmailCampaign(campaignId, fields)

    return campaignId
  }

  // Always created as a draft: a campaign created already scheduled whose id then failed to reach Sanity would go
  // out on its own, and a retry would schedule a second one. sendOrSchedule schedules it once the id is stored and
  // its recipients are verified.
  const { id } = await createEmailCampaign(fields)

  await writeIssueFields(issueId, { brevoCampaignId: id })

  return id
}

/**
 * Re-reads the campaign from Brevo and refuses unless it targets exactly the issue's segment and nothing else: no
 * other segment, no list, and no exclusion list or excluded segment either, so what goes out is exactly what Studio
 * shows. Run before sendNow and before scheduledAt is set, so a campaign changed by hand in Brevo never goes out from
 * here.
 */
async function verifyRecipients(campaignId: number, segment: Segment) {
  const { recipients } = await getEmailCampaign(campaignId)

  if (
    recipients.segments.length !== 1 ||
    recipients.segments[0] !== segment.id ||
    recipients.lists.length > 0 ||
    recipients.exclusionLists.length > 0 ||
    recipients.excludedSegments.length > 0
  ) {
    throw new NewsletterActionError(
      409,
      `The Brevo campaign ${campaignId} does not target only ${describeSegment(segment)}. Nothing was sent or scheduled; check its recipients in Brevo → Campaigns.`,
    )
  }
}

async function sendTest(
  issueId: string,
  published: IssueVersion | null,
  draft: IssueVersion | null,
  user: StudioUser,
): Promise<NewsletterActionResult> {
  const version = (draft ?? published)!

  if (isLockedStatus(published?.status) || isLockedStatus(draft?.status)) {
    throw new NewsletterActionError(409, 'This issue is already scheduled or sent. Cancel a scheduled issue to test it again.')
  }

  if (!user.email) {
    throw new NewsletterActionError(400, 'Your Sanity account has no email address to send the test to.')
  }

  const { fields } = await buildCampaign(issueId, version, 'test')
  const campaignId = await ensureCampaign(
    'test',
    issueId,
    version,
    published?.brevoCampaignId ?? draft?.brevoCampaignId ?? null,
    fields,
  )

  try {
    await sendEmailCampaignTest(campaignId, [user.email])
  } catch (error) {
    if (error instanceof BrevoError && error.status === 400) {
      throw new NewsletterActionError(
        400,
        testRefusalMessage(error, user.email),
        `Brevo refused the test address: ${error.status} ${error.code ?? ''}`,
      )
    }

    throw error
  }

  return {
    status: (version.status as IssueStatus | null) ?? 'draft',
    campaignId,
    message: `Test sent to ${user.email}.`,
  }
}

/** Brevo's reason for refusing a test address, from the error body's address lists. */
function testRefusalMessage(error: BrevoError, email: string): string {
  const reasons: Record<string, string> = {
    blackListedEmails: 'is blocklisted in Brevo',
    unexistingEmails: 'is not a contact in Brevo',
    withoutListEmails: 'is not on any Brevo list',
  }

  for (const [key, reason] of Object.entries(reasons)) {
    const addresses = error.details?.[key]

    if (Array.isArray(addresses) && addresses.length > 0) {
      return `Brevo refused the test: ${addresses.map(String).join(', ')} ${reason}.`
    }
  }

  return `Brevo refused the test to ${email}: ${error.message}`
}

async function sendOrSchedule(
  action: 'send' | 'schedule',
  issueId: string,
  published: IssueVersion | null,
  draft: IssueVersion | null,
): Promise<NewsletterActionResult> {
  if (!published) {
    throw new NewsletterActionError(409, 'Publish the issue first.')
  }

  // What goes out must be what is stored, so a pending draft blocks both.
  if (draft) {
    throw new NewsletterActionError(409, 'Publish your changes first.')
  }

  if (isLockedStatus(published.status)) {
    throw new NewsletterActionError(409, `This issue is already ${published.status}.`)
  }

  let scheduledAt: string | undefined

  if (action === 'schedule') {
    const time = published.scheduledAt ? new Date(published.scheduledAt).getTime() : NaN

    if (Number.isNaN(time)) {
      throw new NewsletterActionError(400, 'Set "Scheduled for" before scheduling.')
    }

    if (time < Date.now() + MIN_SCHEDULE_LEAD_MS) {
      throw new NewsletterActionError(400, 'Choose a time at least 5 minutes from now.')
    }

    scheduledAt = new Date(time).toISOString()
  }

  // Content and segment first, with no scheduledAt; the schedule is set only after the recipients check below.
  const { fields, segment } = await buildCampaign(issueId, published, action)
  const campaignId = await ensureCampaign(action, issueId, published, published.brevoCampaignId, fields)

  await verifyRecipients(campaignId, segment)

  if (action === 'send') {
    // The marker is stored before sendNow, so a request that dies or times out mid-call leaves a trace the next Send
    // respects. It is cleared as soon as the outcome is known: on success (status sent) and on a Brevo refusal
    // (4xx: nothing was sent). It stays only when the outcome is unknown (timeout, network error, Brevo 5xx).
    await writeIssueFields(issueId, { sendRequestedAt: new Date().toISOString() })

    try {
      await sendEmailCampaignNow(campaignId)
    } catch (error) {
      if (error instanceof BrevoError && error.status < 500) {
        await writeIssueFields(issueId, {}, ['sendRequestedAt']).catch((clearError) =>
          console.error(
            `[newsletter] clear send marker ${issueId}:`,
            clearError instanceof Error ? clearError.message : clearError,
          ),
        )
      }

      throw error
    }

    await writeIssueFields(issueId, { status: 'sent', sentAt: new Date().toISOString() }, ['sendRequestedAt'])

    return { status: 'sent', campaignId, message: 'Sent. Brevo is delivering the issue now.' }
  }

  await updateEmailCampaign(campaignId, { scheduledAt })
  await writeIssueFields(issueId, { status: 'scheduled' })

  return { status: 'scheduled', campaignId, message: 'Scheduled in Brevo.' }
}

async function cancel(
  issueId: string,
  published: IssueVersion | null,
  draft: IssueVersion | null,
): Promise<NewsletterActionResult> {
  const status = published?.status ?? draft?.status
  const campaignId = published?.brevoCampaignId ?? draft?.brevoCampaignId ?? null

  if (status !== 'scheduled' || !campaignId) {
    throw new NewsletterActionError(409, 'Only a scheduled issue can be cancelled.')
  }

  const campaign = await getEmailCampaign(campaignId)

  if (campaign.status === 'sent' || campaign.status === 'in_process') {
    if (campaign.status === 'sent') {
      await markSent(issueId, campaign.sentDate)
    }

    throw new NewsletterActionError(409, 'Too late to cancel: Brevo is sending or has sent this issue.')
  }

  // A campaign already out of the queue (e.g. a cancel whose Sanity write failed) needs no Brevo call.
  if (campaign.status === 'queued') {
    await unscheduleEmailCampaign(campaignId)
  } else if (campaign.status === 'suspended') {
    // Already out of the queue: fine only if nothing went out. Paused mid-send is not a cancel.
    if (campaign.sentCount !== 0) {
      throw new NewsletterActionError(
        409,
        'The Brevo campaign was paused after some emails went out. Check it in Brevo → Campaigns.',
      )
    }
  } else if (campaign.status !== 'draft') {
    throw new NewsletterActionError(409, `The Brevo campaign is ${campaign.status.replace('_', ' ')}. Check it in Brevo → Campaigns.`)
  }

  await writeIssueFields(issueId, { status: 'cancelled' })

  return { status: 'cancelled', campaignId, message: 'Cancelled. The issue can be edited again.' }
}

/** Records Brevo's word that the campaign went out, on both versions, and drops the send marker. */
async function markSent(issueId: string, sentDate: string | undefined) {
  await writeIssueFields(
    issueId,
    { status: 'sent', ...(sentDate ? { sentAt: new Date(sentDate).toISOString() } : {}) },
    ['sendRequestedAt'],
  )
}

/**
 * Brings the issue's status in line with Brevo, called by Studio when an issue is opened. Never writes to Brevo.
 * Writes to Sanity only when Brevo reports the campaign sent and the issue does not say so yet.
 */
async function sync(
  issueId: string,
  published: IssueVersion | null,
  draft: IssueVersion | null,
): Promise<NewsletterActionResult> {
  const version = (published ?? draft)!
  const status = (version.status as IssueStatus | null) ?? 'draft'
  const campaignId = published?.brevoCampaignId ?? draft?.brevoCampaignId ?? null

  if (!campaignId) {
    return { status, campaignId: null, message: 'No Brevo campaign yet.' }
  }

  const campaign = await getEmailCampaign(campaignId)

  if (campaign.status === 'sent') {
    const alreadySent = published?.status === 'sent' && (!draft || draft.status === 'sent')

    if (!alreadySent) {
      await markSent(issueId, campaign.sentDate)
    }

    return { status: 'sent', campaignId, message: 'Sent.' }
  }

  if (campaign.status === 'in_process') {
    return { status, campaignId, message: 'Brevo is sending this issue now.' }
  }

  const pending =
    (campaign.status === 'draft' || campaign.status === 'suspended') &&
    version.sendRequestedAt &&
    Date.now() - new Date(version.sendRequestedAt).getTime() < SEND_REQUEST_PENDING_MS

  return {
    status,
    campaignId,
    message: pending
      ? 'A send was requested and Brevo has not started it yet. Check again in a few minutes.'
      : `Brevo campaign status: ${campaign.status.replace('_', ' ')}.`,
  }
}

function statusCodeOf(error: unknown): number | undefined {
  return typeof error === 'object' && error !== null && 'statusCode' in error && typeof error.statusCode === 'number'
    ? error.statusCode
    : undefined
}
