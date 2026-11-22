import 'server-only'

import { after, type NextRequest } from 'next/server'

import { BRANDS, type BrandKey } from '@/brands'

import { BrevoError, sendTransactionalEmail } from './brevo'
import {
  FORM_FIELD_SETS,
  type EnquiryResponse,
  type FormFieldName,
  type FormFieldSetName,
  type FormFieldSpec,
} from './enquiry-form'
import { isFilled, isSameOrigin, readJsonBody, resolveRequestBrand } from './form-request'
import { HONEYPOT_FIELD } from './honeypot'
import { createSubmission, getFormNotification, JotformError } from './jotform'
import { escapeHtml } from './newsletter-email'
import { getNotificationSenderId } from './signup-notification'
import { isEmailAddress } from './subscribe'
import { maskEmails } from './subscribe-contact'

/**
 * The server side of the Sponsorship enquiry and Contact forms, behind `POST /api/enquiry`. The route stays a
 * one-liner; the Jotform and Brevo calls are passed in as `EnquiryDeps` so the flow can be run against stubs.
 *
 * 1. Brand from the Host (the `brand` cookie only on a host that maps to no brand), never from the body; the Origin
 *    must be the same brand (or the same host on a preview).
 * 2. A filled honeypot answers success and sends nothing.
 * 3. The body names its form (`sponsorship` or `contact`); its fields are checked against that form's set in
 *    src/lib/enquiry-form.ts (required, email, longest value), and the consent box must be ticked.
 * 4. The submission is stored on the client's Jotform form, chosen here from the form key. A Jotform failure is the
 *    visitor's error.
 * 5. Jotform emails nobody for an API submission, so after the response the team gets our own email through Brevo,
 *    to the recipients of the form's notification in Jotform, read each time, with Reply-To set to the visitor.
 *    The lead is already stored in Jotform, so a failure here is logged, never shown to the visitor.
 *
 * Rate limiting is not done here: it is a firewall rule on this path.
 */

/** The client's Jotform forms (2026-11-18). JOTFORM_SPONSORSHIP_FORM_ID / JOTFORM_CONTACT_FORM_ID override them. */
const JOTFORM_FORM_IDS: Record<FormFieldSetName, string> = {
  sponsorship: '261893746130360',
  contact: '263214436455355',
}

const formId = (form: FormFieldSetName) =>
  (form === 'sponsorship' ? process.env.JOTFORM_SPONSORSHIP_FORM_ID : process.env.JOTFORM_CONTACT_FORM_ID)?.trim() ||
  JOTFORM_FORM_IDS[form]

/**
 * Each field's Jotform submission key. The two forms are clones, so the question ids match: full name 5 (first and
 * last), job title 6, company 7, email 9, message 29, phone 30 (Contact only, sent as typed: the form's US mask is
 * not applied).
 */
const JOTFORM_KEYS: Record<FormFieldName, string> = {
  firstName: '5_first',
  lastName: '5_last',
  jobTitle: '6',
  company: '7',
  email: '9',
  message: '29',
  phone: '30_full',
}

/**
 * The consent checkbox (question 24, one option "I agree"). UNVERIFIED: no test submission has been sent yet. Jotform
 * support suggests the array form for a checkbox; if a stored submission shows the box empty, try `submission[24]`.
 */
const CONSENT_PARAM = 'submission[24][]'
const CONSENT_VALUE = 'I agree'

/** Names the form in the fallback email subject. */
const FORM_NAMES: Record<FormFieldSetName, string> = {
  sponsorship: 'sponsorship enquiry',
  contact: 'contact message',
}

export type EnquiryDeps = {
  createSubmission: typeof createSubmission
  getFormNotification: typeof getFormNotification
  /** The Brevo sender of the team's notifications; null when none is set. */
  getSenderId: () => Promise<number | null>
  sendTransactionalEmail: typeof sendTransactionalEmail
  /** Runs the team's email once the response is sent: `after` in a request. */
  defer: (task: () => Promise<void>) => void
}

const DEFAULT_DEPS: EnquiryDeps = {
  createSubmission,
  getFormNotification,
  getSenderId: getNotificationSenderId,
  sendTransactionalEmail,
  defer: after,
}

/**
 * The one place for a bot check beyond the honeypot, such as a Turnstile token in the body verified with a fetch
 * to the provider. Answer false to refuse the enquiry with the generic answer. Nothing is checked today.
 */
const passesBotCheck: (request: NextRequest, body: Record<string, unknown>) => Promise<boolean> = async () => true

type Answer = { status: number; body: EnquiryResponse }

const success: Answer = { status: 200, body: { status: 'success' } }

const invalid: Answer = { status: 400, body: { status: 'error', reason: 'invalid' } }

const genericFailure = (status: number): Answer => ({ status, body: { status: 'error', reason: 'failed' } })

const respond = ({ status, body }: Answer) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } })

/** Logs why an enquiry was refused or failed: brand, form and reason only, never the visitor's input. */
function log(brand: BrandKey | null, context: string, error?: unknown) {
  const prefix = `[enquiry] ${brand ?? 'unknown host'} ${context}`

  if (error instanceof JotformError) {
    console.error(`${prefix}: Jotform ${error.status} ${maskEmails(error.message)}`)
  } else if (error instanceof BrevoError) {
    console.error(`${prefix}: Brevo ${error.status} ${error.code ?? ''} ${maskEmails(error.message)}`)
  } else if (error !== undefined) {
    console.error(`${prefix}:`, error instanceof Error ? maskEmails(error.message) : error)
  } else {
    console.error(prefix)
  }
}

/** `POST /api/enquiry`. Always answers JSON shaped as EnquiryResponse, never cached. */
export async function handleEnquiry(request: NextRequest, deps: EnquiryDeps = DEFAULT_DEPS): Promise<Response> {
  const { host, hostBrand, brand } = resolveRequestBrand(request)

  if (!brand) {
    return respond(genericFailure(404))
  }

  if (!isSameOrigin(request.headers.get('origin'), host, hostBrand)) {
    log(brand, 'refused: origin')
    return respond(genericFailure(403))
  }

  const body = await readJsonBody(request)

  if (!body) {
    log(brand, 'refused: body')
    return respond(genericFailure(400))
  }

  // Answered as a success so the bot learns nothing.
  if (isFilled(body[HONEYPOT_FIELD])) {
    return respond(success)
  }

  if (!(await passesBotCheck(request, body))) {
    log(brand, 'refused: bot check')
    return respond(genericFailure(403))
  }

  const enquiry = parseEnquiry(body)

  if (!enquiry) {
    log(brand, 'refused: invalid field')
    return respond(invalid)
  }

  let submissionId: string

  try {
    submissionId = await deps.createSubmission(formId(enquiry.form), jotformParams(enquiry))
  } catch (error) {
    log(brand, `${enquiry.form}: Jotform failed`, error)
    return respond(genericFailure(502))
  }

  deps.defer(() => notifyTeam({ brand, host, enquiry, submissionId }, deps))

  return respond(success)
}

type Enquiry = {
  form: FormFieldSetName
  /** Every field of the form's set, trimmed; '' for an empty optional one. */
  values: Record<string, string>
}

// Control characters never belong in a form value; a message keeps its line breaks and tabs.
const CONTROL_CHARACTERS = /[\u0000-\u001F\u007F]/g
const CONTROL_CHARACTERS_MULTILINE = /[\u0000-\u0008\u000B-\u001F\u007F]/g

/** A field value: trimmed, without control characters; '' when absent; null when not a string or over its limit. */
function readField(value: unknown, field: FormFieldSpec): string | null {
  if (value === undefined || value === null) {
    return ''
  }

  if (typeof value !== 'string') {
    return null
  }

  const text =
    field.type === 'textarea'
      ? value.replace(/\r\n?/g, '\n').replace(CONTROL_CHARACTERS_MULTILINE, '').trim()
      : value.replace(CONTROL_CHARACTERS, '').trim()

  return text.length > field.maxLength ? null : text
}

/**
 * The body as a checked enquiry, or null when anything is wrong: an unknown form, a field of the wrong shape or too
 * long, a required field empty, an email that is not an address, or the consent box not ticked. The browser checks
 * the same, so a person never gets here with a mistake. Fields outside the set are ignored.
 */
function parseEnquiry(body: Record<string, unknown>): Enquiry | null {
  const form = body.form

  if (form !== 'sponsorship' && form !== 'contact') {
    return null
  }

  if (body.consent !== true) {
    return null
  }

  const values: Record<string, string> = {}

  for (const field of FORM_FIELD_SETS[form] as readonly FormFieldSpec[]) {
    const value = readField(body[field.name], field)

    if (value === null || (field.required && !value) || (field.type === 'email' && value && !isEmailAddress(value))) {
      return null
    }

    values[field.name] = value
  }

  return { form, values }
}

/** The submission's form-encoded parameters: each non-empty field under its Jotform key, then the consent box. */
function jotformParams({ form, values }: Enquiry): Record<string, string> {
  const params: Record<string, string> = {}

  for (const field of FORM_FIELD_SETS[form]) {
    if (values[field.name]) {
      params[`submission[${JOTFORM_KEYS[field.name]}]`] = values[field.name]
    }
  }

  params[CONSENT_PARAM] = CONSENT_VALUE

  return params
}

type Notice = { brand: BrandKey; host: string; enquiry: Enquiry; submissionId: string }

/** Emails the team about a stored enquiry. Never throws: a failure is logged, without the visitor's input. */
async function notifyTeam(notice: Notice, deps: EnquiryDeps): Promise<void> {
  const { brand, enquiry } = notice

  try {
    const [notification, senderId] = await Promise.all([
      deps.getFormNotification(formId(enquiry.form)),
      deps.getSenderId(),
    ])

    if (notification.recipients.length === 0) {
      log(brand, `${enquiry.form}: notification not sent: the Jotform form has no notification recipients`)
      return
    }

    if (senderId === null) {
      log(brand, `${enquiry.form}: notification not sent: no sender in Signup notifications`)
      return
    }

    await deps.sendTransactionalEmail({
      senderId,
      to: notification.recipients,
      replyTo: enquiry.values.email,
      ...enquiryEmail(notice, notification),
    })
  } catch (error) {
    log(brand, `${enquiry.form}: notification failed`, error)
  }
}

// Braces are dropped so a value can never form Brevo template syntax in the subject; line breaks would end the header.
const subjectText = (value: string) => value.replace(/[{}\r\n]/g, '').trim()

/**
 * The team's email, modelled on the Jotform notification: its subject template with `{form_title}` and `{fullName}`
 * filled (e.g. "Re: Sponsorship Enquiry - Jane Doe"), or "New sponsorship enquiry: Jane Doe" when the template is
 * missing or uses other tokens; the body a table of every field, plus the site it came from and the Jotform id.
 */
export function enquiryEmail(
  { brand, host, enquiry, submissionId }: Notice,
  notification: { title: string; subject: string | null },
) {
  const { form, values } = enquiry
  const fullName = subjectText(`${values.firstName ?? ''} ${values.lastName ?? ''}`)
  const formTitle = subjectText(notification.title) || FORM_NAMES[form]
  const filled = notification.subject
    ?.replaceAll('{form_title}', formTitle)
    .replaceAll('{fullName}', fullName)
    .replace(/[\r\n]/g, '')
    .trim()
  const subject = filled && !/[{}]/.test(filled) ? filled : `New ${FORM_NAMES[form]}: ${fullName}`
  const site = `${BRANDS[brand].title} (${host})`

  const rows: [string, string][] = [
    ['Website', site],
    ...FORM_FIELD_SETS[form].map(({ name, label }): [string, string] => [label, values[name] ?? '']),
    ['Consent', CONSENT_VALUE],
    ['Jotform submission', submissionId],
  ]

  const htmlContent = [
    '<!doctype html><html><body style="font-family:Arial,sans-serif;font-size:14px;line-height:20px;color:#1a1a1a;">',
    `<p>${escapeHtml(`A visitor sent the ${formTitle} form on ${BRANDS[brand].title}.`)}</p>`,
    '<table cellpadding="4" cellspacing="0" border="0">',
    ...rows.map(
      ([label, value]) =>
        `<tr><td style="color:#666;vertical-align:top;">${escapeHtml(label)}</td><td>${value ? escapeHtml(value).replace(/\n/g, '<br>') : '&ndash;'}</td></tr>`,
    ),
    '</table>',
    '<p style="color:#666;">Reply to this email to answer the sender. The enquiry is also stored in Jotform.</p>',
    '</body></html>',
  ].join('')

  return { subject, htmlContent }
}
