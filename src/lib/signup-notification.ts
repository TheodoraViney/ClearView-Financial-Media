import 'server-only'

import {
  BRAND_KEYS,
  BRANDS,
  SIGNUP_NOTIFICATION_SETTINGS_ID,
  subscribeModalDocumentId,
  type BrandKey,
} from '@/brands'
import { client } from '@/sanity/client'
import { SIGNUP_INTEREST_LABELS_QUERY, SIGNUP_NOTIFICATION_SETTINGS_QUERY } from '@/sanity/queries'

import { BrevoError, sendTransactionalEmail, type BrevoContact } from './brevo'
import { escapeHtml } from './newsletter-email'
import { ATTRIBUTE, maskEmails } from './subscribe-contact'

export type SignupNotificationTargets = {
  recipients: string[]
  senderId: number
}

/**
 * Who gets the team's new-signup email, or null when nobody should: no addresses, or no sender. Published and
 * uncached, so a change in the Studio applies to the next signup. The document id is dotted, which hides it from
 * the public API, so this read needs the read token; without it this throws rather than answering null.
 */
export async function getSignupNotificationSettings(): Promise<SignupNotificationTargets | null> {
  const token = process.env.SANITY_API_READ_TOKEN

  if (!token) {
    throw new Error('Missing environment variable: SANITY_API_READ_TOKEN')
  }

  const settings = await client
    .withConfig({ token, useCdn: false, stega: false })
    .fetch(
      SIGNUP_NOTIFICATION_SETTINGS_QUERY,
      { id: SIGNUP_NOTIFICATION_SETTINGS_ID },
      { perspective: 'published', cache: 'no-store' },
    )

  const recipients = [
    ...new Set((settings?.notifyEmails ?? []).map((email) => email.trim().toLowerCase()).filter(Boolean)),
  ]
  const senderId = settings?.senderId

  return recipients.length > 0 && typeof senderId === 'number' ? { recipients, senderId } : null
}

/** A confirmed signup to tell the team about. `contact` is as Brevo holds it after the signup. */
export type SignupNotice = {
  brand: BrandKey
  email: string
  contact: BrevoContact
  /** Interest attributes this signup set true that the contact did not hold yet. */
  added: string[]
  /** The contact was not a confirmed member of the website list before this signup (see signupChange). */
  isNew: boolean
}

/**
 * Every published pop-up's interests, so an attribute ticked on another brand still gets a label. Where two brands
 * label one attribute differently, the signup brand's label wins.
 */
async function loadLabels(brand: BrandKey): Promise<Map<string, string>> {
  const modals = await client
    .withConfig({ useCdn: false, stega: false })
    .fetch(
      SIGNUP_INTEREST_LABELS_QUERY,
      { ids: BRAND_KEYS.map(subscribeModalDocumentId) },
      { perspective: 'published', cache: 'no-store' },
    )

  const own = subscribeModalDocumentId(brand)
  const labels = new Map<string, string>()

  for (const modal of modals) {
    for (const { attribute, label } of modal.interests ?? []) {
      if (attribute && label?.trim() && (modal._id === own || !labels.has(attribute))) {
        labels.set(attribute, label.trim())
      }
    }
  }

  return labels
}

/** Emails the team about a signup. Never throws: a failure is logged and the signup is unaffected. */
export async function notifySignup(notice: SignupNotice): Promise<void> {
  try {
    const targets = await getSignupNotificationSettings()

    if (!targets) {
      return
    }

    const { subject, htmlContent } = signupEmail(notice, await loadLabels(notice.brand))

    await sendTransactionalEmail({ senderId: targets.senderId, to: targets.recipients, subject, htmlContent })
  } catch (error) {
    const message =
      error instanceof BrevoError
        ? `Brevo ${error.status} ${error.code ?? ''} ${error.message}`
        : error instanceof Error
          ? error.message
          : String(error)

    console.error(`[signup-notification] ${notice.brand} failed: ${maskEmails(message)}`)
  }
}

/** A contact attribute as text: a multiple-choice list joined, anything else that is not text empty. */
function text(value: unknown): string {
  if (Array.isArray(value)) {
    return value.filter((item) => typeof item === 'string').join(', ')
  }

  return typeof value === 'string' ? value.trim() : ''
}

/**
 * The notification's subject and HTML. Interests are the known pop-up attributes the contact holds as true, plus
 * everything in `added`, labelled from the pop-ups (the attribute name when no pop-up has it), new ones marked.
 */
function signupEmail({ brand, email, contact, added, isNew }: SignupNotice, labels: Map<string, string>) {
  const title = BRANDS[brand].title
  const held = [...labels.keys()].filter((name) => contact.attributes[name] === true)
  const interests = [...new Set([...held, ...added])]
  // Braces are dropped so the address can never form Brevo template syntax in the subject.
  const subject = `${isNew ? 'New signup' : 'Updated interests'} on ${title}: ${email.replace(/[{}]/g, '')}`

  const rows: [string, string][] = [
    ['Website', title],
    ['Email', email],
    ['First name', text(contact.attributes[ATTRIBUTE.firstName])],
    ['Last name', text(contact.attributes[ATTRIBUTE.lastName])],
    ['Company', text(contact.attributes[ATTRIBUTE.company])],
    ['Job title', text(contact.attributes[ATTRIBUTE.jobTitle])],
    ['Country', text(contact.attributes[ATTRIBUTE.country])],
    ['Industry', text(contact.attributes[ATTRIBUTE.industry])],
  ]

  const items = interests
    .map((name) => `<li>${escapeHtml(labels.get(name) ?? name)}${added.includes(name) ? ' (new)' : ''}</li>`)
    .join('')

  const htmlContent = [
    '<!doctype html><html><body style="font-family:Arial,sans-serif;font-size:14px;line-height:20px;color:#1a1a1a;">',
    `<p>${escapeHtml(isNew ? `A reader signed up on ${title}.` : `A reader updated their interests on ${title}.`)}</p>`,
    '<table cellpadding="4" cellspacing="0" border="0">',
    ...rows.map(
      ([label, value]) =>
        `<tr><td style="color:#666;vertical-align:top;">${escapeHtml(label)}</td><td>${value ? escapeHtml(value) : '&ndash;'}</td></tr>`,
    ),
    '</table>',
    `<p style="margin-bottom:4px;">Newsletters and interests:</p><ul style="margin-top:0;">${items || '<li>&ndash;</li>'}</ul>`,
    '</body></html>',
  ].join('')

  return { subject, htmlContent }
}
