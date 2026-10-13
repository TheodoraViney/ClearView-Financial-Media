import { CalendarIcon } from '@sanity/icons/Calendar'
import { CloseCircleIcon } from '@sanity/icons/CloseCircle'
import { EnvelopeIcon } from '@sanity/icons/Envelope'
import { PlayIcon } from '@sanity/icons/Play'
import { RefreshIcon } from '@sanity/icons/Refresh'
import { SyncIcon } from '@sanity/icons/Sync'
import { useToast } from '@sanity/ui/toast'
import { useCallback, useEffect, useState, useSyncExternalStore } from 'react'
import {
  type DocumentActionComponent,
  type DocumentActionProps,
  type SanityDocument,
  useClient,
  useCurrentUser,
  useDocumentOperation,
} from 'sanity'

import { BRANDS, isEditorialBrandKey } from '@/brands'
import { isLockedStatus } from '@/lib/newsletter-status'
import { apiVersion } from '@/sanity/env'
import { fetchArticlesPerIssue, fetchLatestPostIds, postReferences } from '@/sanity/newsletter-articles'

/**
 * Studio actions of a newsletter issue: Refresh articles, Send test, Send now, Schedule, Cancel scheduled send, Check status, plus a
 * hidden action that syncs a scheduled issue's status from Brevo when it is opened.
 *
 * Every action calls POST /api/newsletter/{action} with the signed-in user's Sanity token. The server does all the
 * work and writes the status fields itself, so nothing is patched here: the form updates from Sanity's listener.
 * The rules below only decide what is clickable; the server checks every one of them again.
 */

type NewsletterAction = 'test' | 'send' | 'schedule' | 'cancel' | 'sync'

// Refresh articles runs in the browser, not through the API, but shares the in-flight state so it cannot overlap a send.
type RunningAction = NewsletterAction | 'refresh'

type ApiResult = { ok: true; status: string; message: string } | { ok: false; error: string }

// Same roles as src/lib/studio-auth.ts. Other users would only get a 403, so they never see the actions.
const ALLOWED_ROLES = new Set(['administrator', 'editor'])

const GENERIC_ERROR = 'Something went wrong. Check the issue status before trying again.'

const NO_TOKEN_ERROR = 'Sign out and sign in again to send newsletters.'

const NOTICE_MS = 8_000

// ---------------------------------------------------------------------------------------------------------------
// In-flight state, shared by the six visible actions of a document. Module-level, so two buttons (or the same issue open in
// two panes) cannot fire concurrently from this tab. The server lock covers other tabs and other editors.

const running = new Map<string, RunningAction>()
const listeners = new Set<() => void>()

function setRunning(issueId: string, action: RunningAction | null) {
  if (action) {
    running.set(issueId, action)
  } else {
    running.delete(issueId)
  }

  listeners.forEach((listener) => listener())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

function useRunningAction(issueId: string): RunningAction | null {
  return useSyncExternalStore(
    subscribe,
    () => running.get(issueId) ?? null,
    () => null,
  )
}

// Issues already synced in this page session. Opening the same issue again does not call Brevo again.
const synced = new Set<string>()

// ---------------------------------------------------------------------------------------------------------------

async function callNewsletterApi(action: NewsletterAction, issueId: string, token: string): Promise<ApiResult> {
  try {
    const response = await fetch(`/api/newsletter/${action}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
      body: JSON.stringify({ issueId }),
    })
    const body = (await response.json().catch(() => null)) as Partial<{
      ok: boolean
      status: string
      message: string
      error: string
    }> | null

    if (response.ok && body?.ok) {
      return { ok: true, status: body.status ?? '', message: body.message ?? 'Done.' }
    }

    return { ok: false, error: body?.error || GENERIC_ERROR }
  } catch {
    return { ok: false, error: 'Could not reach the server. Check the issue status before trying again.' }
  }
}

type Notice = { status: 'success' | 'error' | 'info'; title: string; description?: string }

/** Pushes a Studio toast. Fire-and-forget: it stays up even if the action component unmounts. */
function useNotice() {
  const { push } = useToast()

  return useCallback(
    (notice: Notice) => {
      push({ ...notice, closable: true, duration: NOTICE_MS })
    },
    [push],
  )
}

/** What every newsletter action needs: who is signed in, their token, the in-flight state and a runner. */
function useNewsletterAction(issueId: string) {
  const user = useCurrentUser()
  // In token login mode the workspace client carries the user's token (see `auth` in sanity.config.ts).
  const token = useClient({ apiVersion }).config().token
  const runningAction = useRunningAction(issueId)
  const notify = useNotice()

  const allowed = Boolean(user?.roles.some((role) => ALLOWED_ROLES.has(role.name)))

  const run = useCallback(
    async (action: NewsletterAction, failureTitle: string) => {
      if (!token) {
        notify({ status: 'error', title: NO_TOKEN_ERROR })
        return
      }

      if (running.has(issueId)) {
        return
      }

      setRunning(issueId, action)

      try {
        const result = await callNewsletterApi(action, issueId, token)

        notify(
          result.ok
            ? { status: 'success', title: result.message }
            : { status: 'error', title: failureTitle, description: result.error },
        )
      } finally {
        setRunning(issueId, null)
      }
    },
    [issueId, notify, token],
  )

  return { allowed, runningAction, run }
}

// ---------------------------------------------------------------------------------------------------------------
// Document state

type IssueFields = {
  brand?: string
  subject?: string
  posts?: unknown[]
  scheduledAt?: string
  status?: string
  sendRequestedAt?: string
  brevoCampaignId?: number
}

const fieldsOf = (document: SanityDocument | null) => (document ?? {}) as IssueFields

function issueState({ draft, published }: DocumentActionProps) {
  const current = fieldsOf(draft ?? published)
  const locked = isLockedStatus(draft?.status) || isLockedStatus(published?.status)
  const scheduled = draft?.status === 'scheduled' || published?.status === 'scheduled'

  return { current, locked, scheduled, draft, published: published ? fieldsOf(published) : null }
}

const brandTitle = (brand: string | undefined) =>
  brand && isEditorialBrandKey(brand) ? BRANDS[brand].title : 'this publication'

const ukDateTime = (value: string) =>
  new Date(value).toLocaleString('en-GB', {
    timeZone: 'Europe/London',
    dateStyle: 'full',
    timeStyle: 'short',
  })

const BUSY_TITLE = 'Another newsletter action is running for this issue.'

/**
 * Why Send now or Schedule cannot run, or null when it can. Both send the published issue, so a pending draft
 * blocks them: what goes out must be what is stored.
 */
function publishedIssueBlocker(props: DocumentActionProps): string | null {
  const { locked, draft, published } = issueState(props)

  if (locked) {
    return 'This issue is already scheduled or sent.'
  }

  if (!published) {
    return 'Publish the issue first.'
  }

  if (draft) {
    return 'Publish your changes first.'
  }

  if (!published.subject?.trim()) {
    return 'Add a subject and publish first.'
  }

  if (!published.posts?.length) {
    return 'Add at least one post and publish first.'
  }

  return null
}

// ---------------------------------------------------------------------------------------------------------------
// Actions

/**
 * Replaces the issue's posts with the brand's latest published articles, the same pick a new issue starts with.
 * An ordinary edit: it patches the draft through the document store and the editor publishes as usual. Open to anyone
 * who can edit the issue; it never calls the newsletter API.
 */
export const RefreshNewsletterArticlesAction: DocumentActionComponent = (props) => {
  const { id, type } = props
  const runningAction = useRunningAction(id)
  const { patch } = useDocumentOperation(id, type)
  const client = useClient({ apiVersion })
  const notify = useNotice()
  const [confirmCount, setConfirmCount] = useState<number | null>(null)
  const { current, locked, draft, published } = issueState(props)
  const brand = current.brand && isEditorialBrandKey(current.brand) ? current.brand : null

  // An issue that was never saved already holds the latest articles from its template. Patching it would create a
  // draft without the template's brand, so it waits for the first save.
  const reason = runningAction
    ? BUSY_TITLE
    : locked
      ? 'This issue is already scheduled or sent. Cancel a scheduled issue to change its articles.'
      : !draft && !published
        ? 'Edit any field first.'
        : !brand
          ? 'Create the issue inside a publication folder.'
          : patch.disabled
            ? 'The issue is not ready to edit yet.'
            : null

  const withRunning = async (task: () => Promise<void>) => {
    if (running.has(id)) {
      return
    }

    setRunning(id, 'refresh')

    try {
      await task()
    } finally {
      setRunning(id, null)
    }
  }

  return {
    label: runningAction === 'refresh' ? 'Refreshing…' : 'Refresh articles',
    icon: SyncIcon,
    disabled: reason !== null,
    title: reason ?? 'Replace the articles with the latest published ones.',
    onHandle: () => {
      if (!brand) {
        return
      }

      void withRunning(async () => {
        try {
          setConfirmCount(await fetchArticlesPerIssue(client, brand))
        } catch {
          notify({ status: 'error', title: 'Articles not refreshed', description: 'Could not read Brand settings.' })
        }
      })
    },
    dialog:
      confirmCount !== null
        ? {
            type: 'confirm',
            message: `Replace the articles with the ${confirmCount} latest articles?`,
            confirmButtonText: 'Refresh articles',
            onCancel: () => setConfirmCount(null),
            onConfirm: () => {
              const count = confirmCount
              setConfirmCount(null)

              // The dialog stays open while the issue changes underneath (scheduled by another editor, a send
              // started): re-check with the latest props instead of patching a locked issue or doing nothing.
              if (!brand || reason !== null) {
                notify({ status: 'error', title: 'Articles not refreshed', description: reason ?? undefined })
                return
              }

              void withRunning(async () => {
                try {
                  const ids = await fetchLatestPostIds(client, { brand, count })

                  if (ids.length === 0) {
                    notify({ status: 'info', title: 'No published articles found.' })
                    return
                  }

                  patch.execute([{ set: { posts: postReferences(ids) } }])
                  notify({
                    status: 'success',
                    title: `Articles refreshed: ${ids.length} ${ids.length === 1 ? 'article' : 'articles'}.`,
                  })
                } catch {
                  notify({
                    status: 'error',
                    title: 'Articles not refreshed',
                    description: 'Could not read the latest articles. Try again.',
                  })
                }
              })
            },
          }
        : null,
  }
}
RefreshNewsletterArticlesAction.displayName = 'RefreshNewsletterArticlesAction'

export const SendTestNewsletterAction: DocumentActionComponent = (props) => {
  const { allowed, runningAction, run } = useNewsletterAction(props.id)
  const { locked, draft, published } = issueState(props)

  if (!allowed) {
    return null
  }

  const reason = runningAction
    ? BUSY_TITLE
    : locked
      ? 'This issue is already scheduled or sent. Cancel a scheduled issue to test it again.'
      : !draft && !published
        ? 'Edit any field first.'
        : null

  return {
    label: runningAction === 'test' ? 'Sending test…' : 'Send test',
    icon: EnvelopeIcon,
    disabled: reason !== null,
    title: reason ?? 'Send this issue to your own email address. Unpublished changes are included.',
    onHandle: () => {
      void run('test', 'Test not sent')
    },
  }
}
SendTestNewsletterAction.displayName = 'SendTestNewsletterAction'

export const SendNowNewsletterAction: DocumentActionComponent = (props) => {
  const { allowed, runningAction, run } = useNewsletterAction(props.id)
  const [confirming, setConfirming] = useState(false)
  const { current } = issueState(props)

  if (!allowed) {
    return null
  }

  const reason = runningAction ? BUSY_TITLE : publishedIssueBlocker(props)

  return {
    label: runningAction === 'send' ? 'Sending…' : 'Send now',
    icon: PlayIcon,
    tone: 'primary',
    disabled: reason !== null,
    title: reason ?? undefined,
    onHandle: () => setConfirming(true),
    dialog: confirming
      ? {
          type: 'confirm',
          tone: 'primary',
          message: `Send this ${brandTitle(current.brand)} issue to the newsletter list now? This cannot be undone.`,
          confirmButtonText: 'Send now',
          onCancel: () => setConfirming(false),
          onConfirm: () => {
            setConfirming(false)
            void run('send', 'Not sent')
          },
        }
      : null,
  }
}
SendNowNewsletterAction.displayName = 'SendNowNewsletterAction'

export const ScheduleNewsletterAction: DocumentActionComponent = (props) => {
  const { allowed, runningAction, run } = useNewsletterAction(props.id)
  const [confirming, setConfirming] = useState(false)
  const { current, published } = issueState(props)

  if (!allowed) {
    return null
  }

  const scheduledAt = published?.scheduledAt
  const reason = runningAction
    ? BUSY_TITLE
    : (publishedIssueBlocker(props) ?? (scheduledAt ? null : 'Set "Scheduled for" and publish first.'))

  return {
    label: runningAction === 'schedule' ? 'Scheduling…' : 'Schedule',
    icon: CalendarIcon,
    disabled: reason !== null,
    title: reason ?? undefined,
    onHandle: () => setConfirming(true),
    dialog:
      confirming && scheduledAt
        ? {
            type: 'confirm',
            tone: 'primary',
            message: `Schedule this ${brandTitle(current.brand)} issue for ${ukDateTime(scheduledAt)} (UK time)?`,
            confirmButtonText: 'Schedule',
            onCancel: () => setConfirming(false),
            onConfirm: () => {
              setConfirming(false)
              void run('schedule', 'Not scheduled')
            },
          }
        : null,
  }
}
ScheduleNewsletterAction.displayName = 'ScheduleNewsletterAction'

export const CancelScheduledNewsletterAction: DocumentActionComponent = (props) => {
  const { allowed, runningAction, run } = useNewsletterAction(props.id)
  const [confirming, setConfirming] = useState(false)
  const { scheduled } = issueState(props)

  if (!allowed) {
    return null
  }

  const reason = runningAction ? BUSY_TITLE : scheduled ? null : 'Only a scheduled issue can be cancelled.'

  return {
    label: runningAction === 'cancel' ? 'Cancelling…' : 'Cancel scheduled send',
    icon: CloseCircleIcon,
    tone: 'critical',
    disabled: reason !== null,
    title: reason ?? undefined,
    onHandle: () => setConfirming(true),
    dialog: confirming
      ? {
          type: 'confirm',
          tone: 'critical',
          message: 'Cancel the scheduled send? The issue goes back to editable and nothing is sent.',
          confirmButtonText: 'Cancel scheduled send',
          cancelButtonText: 'Keep scheduled',
          onCancel: () => setConfirming(false),
          onConfirm: () => {
            setConfirming(false)
            void run('cancel', 'Not cancelled')
          },
        }
      : null,
  }
}
CancelScheduledNewsletterAction.displayName = 'CancelScheduledNewsletterAction'

/** Asks the server to compare the issue with its Brevo campaign. Writes to Sanity only when Brevo says sent. */
export const CheckNewsletterStatusAction: DocumentActionComponent = (props) => {
  const { allowed, runningAction, run } = useNewsletterAction(props.id)

  if (!allowed) {
    return null
  }

  const campaignId = fieldsOf(props.published).brevoCampaignId ?? fieldsOf(props.draft).brevoCampaignId
  const reason = runningAction ? BUSY_TITLE : campaignId ? null : 'Nothing sent to Brevo yet.'

  return {
    label: runningAction === 'sync' ? 'Checking…' : 'Check status',
    icon: RefreshIcon,
    disabled: reason !== null,
    title: reason ?? 'Check the Brevo campaign and update the status if it has been sent.',
    onHandle: () => {
      void run('sync', 'Could not check the status')
    },
  }
}
CheckNewsletterStatusAction.displayName = 'CheckNewsletterStatusAction'

/**
 * Never rendered (returns null): a document action is the one hook Studio runs whenever an issue is open, with its
 * draft and published versions as props, so it is the simplest place for the sync. When a scheduled issue (or one
 * with a send in an unknown state) is opened, it asks the server once per page session to check Brevo. Silent unless
 * the issue turned out to be sent; the status fields update through Sanity's listener after the server's write.
 */
export const SyncNewsletterAction: DocumentActionComponent = (props) => {
  const { id, ready } = props
  const user = useCurrentUser()
  const token = useClient({ apiVersion }).config().token
  const notify = useNotice()
  const { current, scheduled } = issueState(props)

  const allowed = Boolean(user?.roles.some((role) => ALLOWED_ROLES.has(role.name)))
  const needsSync = scheduled || Boolean(current.sendRequestedAt)
  const statusBefore = current.status

  useEffect(() => {
    if (!ready || !allowed || !token || !needsSync || synced.has(id)) {
      return
    }

    synced.add(id)

    void callNewsletterApi('sync', id, token).then((result) => {
      // A failed check is retried the next time the issue is opened.
      if (!result.ok) {
        synced.delete(id)
        return
      }

      if (result.ok && result.status === 'sent' && statusBefore !== 'sent') {
        notify({ status: 'success', title: 'This issue has been sent', description: result.message })
      }
    })
  }, [allowed, id, needsSync, notify, ready, statusBefore, token])

  return null
}
SyncNewsletterAction.displayName = 'SyncNewsletterAction'

/** In the order they appear after the built-in actions. */
export const newsletterIssueActions: DocumentActionComponent[] = [
  RefreshNewsletterArticlesAction,
  SendTestNewsletterAction,
  SendNowNewsletterAction,
  ScheduleNewsletterAction,
  CancelScheduledNewsletterAction,
  CheckNewsletterStatusAction,
  SyncNewsletterAction,
]
