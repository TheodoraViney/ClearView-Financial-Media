import 'server-only'

import { after, type NextRequest } from 'next/server'

import {
  brandOrigin,
  fallbackBrand,
  resolveBrandFromHost,
  SUBSCRIBE_FORM_SETTINGS_ID,
  subscribeModalDocumentId,
  type BrandKey,
} from '@/brands'
import { client } from '@/sanity/client'
import { SUBSCRIBE_CONFIG_QUERY } from '@/sanity/queries'
import type { SUBSCRIBE_CONFIG_QUERY_RESULT } from '@/sanity/types'

import {
  BrevoError,
  getContact,
  isInvalidEmailError,
  subscribeWithDoubleOptIn,
  upsertContact,
  type BrevoAttributes,
  type BrevoContact,
} from './brevo'
import { HONEYPOT_FIELD } from './honeypot'
import { notifySignup } from './signup-notification'
import { createSignupToken, readSignupToken, signupNotifySecret, type SignupToken } from './signup-token'
import { isEmailAddress, SUBSCRIBE_MAX_LENGTH, type SubscribeField, type SubscribeResponse } from './subscribe'
import { ATTRIBUTE, isConfirmed, maskEmails } from './subscribe-contact'
import { NO_OPTIONS, subscribeOptions, type SubscribeOptions } from './subscribe-options'

/**
 * The server side of the subscribe pop-up, behind `POST /api/subscribe`. The route stays a one-liner; everything it
 * decides is here, with the Sanity read and the Brevo calls passed in as `SubscribeDeps` so the flow can be run
 * against stubs.
 *
 * 1. Brand from the Host (the `brand` cookie only on a host that maps to no brand), never from the body; the Origin
 *    must be the same brand (or the same host on a preview).
 * 2. A filled honeypot answers success and sends nothing.
 * 3. The body is checked field by field. Every interest key it names is looked up in the brand's published pop-up
 *    document, read uncached so an editor's change applies at once; country and industry must be one of
 *    Brevo's own options (the same cached lists the page shows). Anything unknown is refused with the generic answer,
 *    since the form cannot produce it. Brevo attribute names come only from the documents.
 * 4. GET the contact. Confirmed (DOUBLE_OPT-IN "1", not blacklisted) and the signup changes nothing on it: no email,
 *    at most it joins the list and gets SOURCE when it has none. Anything new or different, or anyone else (new, unconfirmed, blacklisted): double
 *    opt-in, so the owner of the address confirms every change by clicking. The answer is the same success either
 *    way.
 * 5. The team hears about a reader who joins the website list or adds interests (src/lib/signup-notification.ts),
 *    after the response: at once on the no-email path, otherwise when the click lands on `GET
 *    /api/subscribe/confirmed` with the encrypted token (src/lib/signup-token.ts) that the confirmation redirect carries.
 *
 * Rate limiting is not done here: it is a firewall rule on this path.
 */

/** What SOURCE gets on a contact that has none yet. */
const SIGNUP_SOURCE = 'Newsletter Signup'

/** Where Brevo sends the reader after the confirmation click; the route is src/app/api/subscribe/confirmed. */
const CONFIRMED_PATH = '/api/subscribe/confirmed'

/** Largest body accepted. The form sends well under 2 KB. */
const MAX_BODY_BYTES = 16_384

// Longest Sanity `_key` accepted; the text fields' limits are SUBSCRIBE_MAX_LENGTH.
const MAX_KEY_LENGTH = 128

// Longest country or industry accepted before it is looked up in Brevo's options.
const MAX_OPTION_LENGTH = 200

/** Most keys one list in the body may carry; the CMS allows 8 interests. */
const MAX_KEYS = 16

// Control characters never belong in a name or company.
const CONTROL_CHARACTERS = /[\u0000-\u001F\u007F]/g

// A Sanity `_key` as the site writes them.
const KEY_PATTERN = /^[A-Za-z0-9_.-]+$/

// A Brevo attribute name as the Studio picker stores it.
const ATTRIBUTE_NAME_PATTERN = /^[A-Z][A-Z0-9_-]*$/

export type SubscribeConfig = SUBSCRIBE_CONFIG_QUERY_RESULT

export type SubscribeDeps = {
  loadConfig: (brand: BrandKey) => Promise<SubscribeConfig>
  /** Brevo's Country and Industry options; empty lists when Brevo cannot be read. */
  loadOptions: () => Promise<SubscribeOptions>
  getContact: (email: string) => Promise<BrevoContact | null>
  upsertContact: typeof upsertContact
  subscribeWithDoubleOptIn: typeof subscribeWithDoubleOptIn
}

/** Published, uncached: a list, template or option change in the Studio applies to the next signup. */
async function loadConfig(brand: BrandKey) {
  return client.withConfig({ useCdn: false, stega: false }).fetch(
    SUBSCRIBE_CONFIG_QUERY,
    { subscribeModalId: subscribeModalDocumentId(brand), subscribeSettingsId: SUBSCRIBE_FORM_SETTINGS_ID },
    { perspective: 'published', cache: 'no-store' },
  )
}

const DEFAULT_DEPS: SubscribeDeps = {
  loadConfig,
  loadOptions: subscribeOptions,
  getContact,
  upsertContact,
  subscribeWithDoubleOptIn,
}

/**
 * The one place for a bot check beyond the honeypot, such as a Turnstile token in the body verified with a fetch
 * to the provider. Answer false to refuse the signup with the generic answer. Nothing is checked today.
 */
const passesBotCheck: (request: NextRequest, body: Record<string, unknown>) => Promise<boolean> = async () => true

type Answer = { status: number; body: SubscribeResponse }

const success: Answer = { status: 200, body: { status: 'success' } }

const invalid = (fields: SubscribeField[]): Answer => ({ status: 400, body: { status: 'error', reason: 'invalid', fields } })

const invalidEmail: Answer = { status: 400, body: { status: 'error', reason: 'invalid-email' } }

const genericFailure = (status: number): Answer => ({ status, body: { status: 'error', reason: 'failed' } })

const respond = ({ status, body }: Answer) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } })

/** Logs why a signup was refused or failed: brand and reason only, never the visitor's input. */
function log(brand: BrandKey | null, context: string, error?: unknown) {
  const prefix = `[subscribe] ${brand ?? 'unknown host'} ${context}`

  if (error instanceof BrevoError) {
    // Brevo messages can quote the address; it is masked.
    console.error(`${prefix}: Brevo ${error.status} ${error.code ?? ''} ${maskEmails(error.message)}`)
  } else if (error !== undefined) {
    console.error(`${prefix}:`, error instanceof Error ? maskEmails(error.message) : error)
  } else {
    console.error(prefix)
  }
}

/** `POST /api/subscribe`. Always answers JSON shaped as SubscribeResponse, never cached. */
export async function handleSubscribe(request: NextRequest, deps: SubscribeDeps = DEFAULT_DEPS): Promise<Response> {
  const host = request.headers.get('host') ?? ''
  const hostBrand = resolveBrandFromHost(host)
  const brand = hostBrand ?? fallbackBrand(request.cookies.get('brand')?.value)

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

  return respond(await subscribe(brand, body, deps))
}

/**
 * The Origin of a same-site form post. On a brand host any host of the same brand passes (apex, www, staging,
 * localhost); on a host that maps to no brand (a preview) only that very host. Browsers send Origin on every POST.
 */
function isSameOrigin(origin: string | null, host: string, hostBrand: BrandKey | null) {
  if (!origin) {
    return false
  }

  let originHost: string

  try {
    originHost = new URL(origin).host
  } catch {
    return false
  }

  return hostBrand ? resolveBrandFromHost(originHost) === hostBrand : originHost.toLowerCase() === host.toLowerCase()
}

/** The JSON object body, or null when it is not JSON, not an object, or too large. */
async function readJsonBody(request: NextRequest): Promise<Record<string, unknown> | null> {
  if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) {
    return null
  }

  if (Number(request.headers.get('content-length') ?? 0) > MAX_BODY_BYTES) {
    return null
  }

  const text = await readCapped(request.body, MAX_BODY_BYTES).catch(() => null)

  if (!text) {
    return null
  }

  try {
    const value: unknown = JSON.parse(text)

    return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : null
  } catch {
    return null
  }
}

/**
 * The stream as UTF-8 text, or null once it passes `max` bytes: reading stops there, so a body without a
 * content-length, or with a false one, is never read in full.
 */
async function readCapped(stream: ReadableStream<Uint8Array> | null, max: number): Promise<string | null> {
  if (!stream) {
    return null
  }

  const reader = stream.getReader()
  const chunks: Uint8Array[] = []
  let size = 0

  for (;;) {
    const { done, value } = await reader.read()

    if (done) {
      break
    }

    size += value.byteLength

    if (size > max) {
      await reader.cancel().catch(() => undefined)
      return null
    }

    chunks.push(value)
  }

  const bytes = new Uint8Array(size)
  let offset = 0

  for (const chunk of chunks) {
    bytes.set(chunk, offset)
    offset += chunk.byteLength
  }

  return new TextDecoder().decode(bytes)
}

const isFilled = (value: unknown) => typeof value === 'string' && value.trim() !== ''

/** A form text: trimmed, without control characters; '' when absent; null when not a string or over `max`. */
function readText(value: unknown, max: number): string | null {
  if (value === undefined || value === null) {
    return ''
  }

  if (typeof value !== 'string') {
    return null
  }

  const text = value.replace(CONTROL_CHARACTERS, '').trim()

  return text.length > max ? null : text
}

/** A list of keys without repeats, or null when it is not one. */
function readKeys(value: unknown): string[] | null {
  if (value === undefined) {
    return []
  }

  if (!Array.isArray(value) || value.length > MAX_KEYS) {
    return null
  }

  const keys = new Set<string>()

  for (const item of value) {
    if (typeof item !== 'string' || item.length > MAX_KEY_LENGTH || !KEY_PATTERN.test(item)) {
      return null
    }

    keys.add(item)
  }

  return [...keys]
}

type SignupRequest = {
  firstName: string
  lastName: string
  email: string
  company: string
  jobTitle: string
  country: string
  industry: string
  interests: string[]
  consent: boolean
}

/** The body as a typed request, or null when any field has the wrong shape (not something the form sends). */
function parseRequest(body: Record<string, unknown>): SignupRequest | null {
  const firstName = readText(body.firstName, SUBSCRIBE_MAX_LENGTH.firstName)
  const lastName = readText(body.lastName, SUBSCRIBE_MAX_LENGTH.lastName)
  // Not capped here: an over-long address is the email error, from isEmailAddress, not a malformed body.
  const email = readText(body.email, MAX_BODY_BYTES)
  const company = readText(body.company, SUBSCRIBE_MAX_LENGTH.company)
  const jobTitle = readText(body.jobTitle, SUBSCRIBE_MAX_LENGTH.jobTitle)
  const country = readText(body.country, MAX_OPTION_LENGTH)
  const industry = readText(body.industry, MAX_OPTION_LENGTH)
  const interests = readKeys(body.interests)

  if (
    firstName === null ||
    lastName === null ||
    email === null ||
    company === null ||
    jobTitle === null ||
    country === null ||
    industry === null ||
    interests === null ||
    (body.consent !== undefined && typeof body.consent !== 'boolean')
  ) {
    return null
  }

  return { firstName, lastName, email, company, jobTitle, country, industry, interests, consent: body.consent === true }
}

/** The fields a person can get wrong, in form order; the form checks the same. */
function invalidFields(request: SignupRequest, brand: BrandKey): SubscribeField[] {
  const fields: SubscribeField[] = []

  if (!request.firstName) fields.push('firstName')
  if (!request.lastName) fields.push('lastName')
  if (!isEmailAddress(request.email)) fields.push('email')
  // ClearView has no newsletter of its own and locks nothing, so one interest must be ticked there.
  if (brand === 'clearview' && request.interests.length === 0) fields.push('interests')
  if (!request.consent) fields.push('consent')

  return fields
}

/**
 * The checked signup: the address, the Brevo attributes it sets and where it goes. `attributes` holds what the
 * reader chose (names, company, job title, country, industry, interest flags); consent and SOURCE are added when it
 * is sent.
 */
type Signup = {
  email: string
  attributes: BrevoAttributes
  /** The interest attributes it sets true, also in `attributes`. */
  interests: string[]
  listId: number
  templateId: number
}

/**
 * Maps the request's keys to Brevo through the documents, and checks country and industry against Brevo's options.
 * Null when anything is unknown or the documents are incomplete; the reason is logged.
 */
function resolveSignup(
  request: SignupRequest,
  brand: BrandKey,
  config: SubscribeConfig,
  options: SubscribeOptions,
): Signup | null {
  const refuse = (reason: string) => {
    log(brand, `refused: ${reason}`)
    return null
  }

  const settings = config.settings
  const listId = settings?.listId
  const templateId = settings?.templateId

  if (!isBrevoId(listId) || !isBrevoId(templateId)) {
    return refuse('Subscribe form settings missing a list or confirmation email')
  }

  const attributes: BrevoAttributes = {
    [ATTRIBUTE.firstName]: request.firstName,
    [ATTRIBUTE.lastName]: request.lastName,
  }

  // Empty optional fields are never sent, so an existing contact keeps what Brevo already has.
  if (request.company) attributes[ATTRIBUTE.company] = request.company
  if (request.jobTitle) attributes[ATTRIBUTE.jobTitle] = request.jobTitle

  if (request.country) {
    if (!options.countries.includes(request.country)) {
      return refuse('unknown country')
    }

    attributes[ATTRIBUTE.country] = [request.country]
  }

  if (request.industry) {
    if (!options.industries.includes(request.industry)) {
      return refuse('unknown industry')
    }

    attributes[ATTRIBUTE.industry] = [request.industry]
  }

  const flags = new Set<string>()
  const interests = config.modal?.interests ?? []

  for (const key of request.interests) {
    const interest = interests.find((item) => item._key === key)

    if (!interest?.attribute) {
      return refuse('unknown interest')
    }

    flags.add(interest.attribute)
  }

  // On a publication, always ticked whatever the form sent: a disabled box is not submitted. ClearView locks nothing,
  // as the pop-up shows it.
  if (brand !== 'clearview') {
    for (const interest of interests) {
      if (interest.locked && interest.attribute) {
        flags.add(interest.attribute)
      }
    }

    if (!interests.some((interest) => interest.locked && interest.attribute)) {
      return refuse('pop-up document missing its always ticked interest')
    }
  }

  for (const name of flags) {
    if (!ATTRIBUTE_NAME_PATTERN.test(name)) {
      return refuse('malformed attribute name')
    }

    // Booleans are only ever set to true, never cleared.
    attributes[name] = true
  }

  return { email: request.email, attributes, interests: [...flags], listId, templateId }
}

const isBrevoId = (value: unknown): value is number => typeof value === 'number' && Number.isInteger(value) && value > 0

/** True when the contact has no SOURCE yet: absent, empty text or an empty list. */
function hasNoSource(contact: BrevoContact | null) {
  const value = contact?.attributes[ATTRIBUTE.source]

  return value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0)
}

/**
 * What the team's notification says about this signup. New: the contact is not both confirmed and on the website
 * list, whatever it holds (imported, or never clicked), so every interest it ticks counts as added. Otherwise only the
 * interests it does not hold as true yet are added.
 */
function signupChange(contact: BrevoContact | null, interests: string[], listId: number) {
  const isNew = !(isConfirmed(contact) && contact.listIds.includes(listId))
  const added = isNew ? interests : interests.filter((name) => contact?.attributes[name] !== true)

  return { isNew, added }
}

// Logged once per instance: a missing secret is configuration, not a per-signup event.
let warnedNoSecret = false

/**
 * Where Brevo sends the reader after the click: the confirmed route with a token, or the brand home when
 * SIGNUP_NOTIFY_SECRET is unset, so the signup works and only the notification is lost.
 */
function confirmationRedirect(token: Omit<SignupToken, 'iat'>): string {
  const secret = signupNotifySecret()

  if (!secret) {
    if (!warnedNoSecret) {
      warnedNoSecret = true
      log(token.brand, 'SIGNUP_NOTIFY_SECRET missing: confirmed signups are not notified')
    }

    return `${brandOrigin(token.brand)}/`
  }

  return `${brandOrigin(token.brand)}${CONFIRMED_PATH}?t=${createSignupToken(token, secret)}`
}

/**
 * True when the contact already holds every value: each flag already true, each text the same, each multiple-choice
 * attribute exactly that one option. Brevo returns a multiple-choice value as a list, or as text when it holds one.
 */
function holdsAll(contact: BrevoContact, attributes: BrevoAttributes) {
  return Object.entries(attributes).every(([name, value]) => {
    const current = contact.attributes[name]

    if (Array.isArray(value)) {
      const held = Array.isArray(current) ? current : typeof current === 'string' ? [current] : []

      return held.length === value.length && value.every((option) => held.includes(option))
    }

    if (typeof value === 'string') {
      return typeof current === 'string' && current.trim() === value
    }

    return current === value
  })
}

async function subscribe(brand: BrandKey, body: Record<string, unknown>, deps: SubscribeDeps): Promise<Answer> {
  const request = parseRequest(body)

  if (!request) {
    log(brand, 'refused: malformed field')
    return genericFailure(400)
  }

  const fields = invalidFields(request, brand)

  if (fields.length > 0) {
    return invalid(fields)
  }

  let loaded: [SubscribeConfig, SubscribeOptions]

  try {
    loaded = await Promise.all([
      deps.loadConfig(brand),
      // Brevo's lists only when the signup names a country or industry.
      request.country || request.industry ? deps.loadOptions() : NO_OPTIONS,
    ])
  } catch (error) {
    log(brand, 'reading the documents failed', error)
    return genericFailure(502)
  }

  const signup = resolveSignup(request, brand, ...loaded)

  if (!signup) {
    return genericFailure(400)
  }

  try {
    const contact = await deps.getContact(signup.email)

    // Nothing new for a confirmed contact: no email. SOURCE is bookkeeping, not the reader's choice, so an empty one
    // is filled here without counting as a change. No write unless SOURCE or the list membership is missing. Consent
    // is never sent on this path, so it never changes without a click.
    if (isConfirmed(contact) && holdsAll(contact, signup.attributes)) {
      const fillSource = hasNoSource(contact)
      const joinList = !contact.listIds.includes(signup.listId)

      if (fillSource || joinList) {
        await deps.upsertContact({
          email: signup.email,
          ...(fillSource && { attributes: { [ATTRIBUTE.source]: [SIGNUP_SOURCE] } }),
          listIds: joinList ? [signup.listId] : [],
        })
      }

      // A confirmed reader joining the website list now, with no click to wait for, is a signup the team hears about.
      if (joinList) {
        const { added } = signupChange(contact, signup.interests, signup.listId)

        after(() => notifySignup({ brand, email: signup.email, contact, added, isNew: true }))
      }

      return success
    }

    await deps.subscribeWithDoubleOptIn({
      email: signup.email,
      attributes: {
        ...signup.attributes,
        [ATTRIBUTE.consent]: true,
        ...(hasNoSource(contact) && { [ATTRIBUTE.source]: [SIGNUP_SOURCE] }),
      },
      listIds: [signup.listId],
      templateId: signup.templateId,
      redirectionUrl: confirmationRedirect({
        email: signup.email,
        brand,
        ...signupChange(contact, signup.interests, signup.listId),
      }),
    })

    return success
  } catch (error) {
    if (isInvalidEmailError(error)) {
      return invalidEmail
    }

    log(brand, 'Brevo failed', error)
    return genericFailure(502)
  }
}

/**
 * Replay guard for the confirmed route. The token stays valid for 30 days and the URL can be opened again (back
 * button, history, a forwarded link), so a click only counts when Brevo changed the contact after the token was issued
 * and within the last 15 minutes: the confirmation itself. Tokens already handled by this instance are skipped too, so
 * a burst of repeats inside that window sends one email. The set is per instance and bounded; it is not a ledger.
 * Known limits: a mail scanner that confirms without following the redirect, then a human click after 15 minutes,
 * sends nothing; two clicks landing on different instances within 15 minutes can send two.
 */
const CONFIRMATION_WINDOW_MS = 15 * 60 * 1000
const MODIFIED_SKEW_MS = 60 * 1000
const HANDLED_TOKENS_MAX = 500
const handledTokens = new Set<string>()

/** Marks a token handled; false when it was already. Drops the oldest beyond HANDLED_TOKENS_MAX. */
function claimToken(token: string) {
  if (handledTokens.has(token)) {
    return false
  }

  handledTokens.add(token)

  if (handledTokens.size > HANDLED_TOKENS_MAX) {
    handledTokens.delete(handledTokens.values().next().value as string)
  }

  return true
}

// Milliseconds after the click at which the contact is read: Brevo may redirect before it has saved the change.
const CONFIRMATION_ATTEMPTS_MS = [0, 3_000, 10_000]

/**
 * Whether a confirmation click is one the team hears about: the contact is confirmed, on the website list, holds
 * every interest the signup added, and was changed by this confirmation (see CONFIRMATION_WINDOW_MS). Nothing added
 * (a confirmed reader changing only their name, say) is no news.
 */
function shouldNotifyConfirmed(
  contact: BrevoContact | null,
  token: SignupToken,
  listId: number | null | undefined,
  now: number,
): contact is BrevoContact {
  const modifiedAt = contact?.modifiedAt ? Date.parse(contact.modifiedAt) : NaN

  return (
    isConfirmed(contact) &&
    isBrevoId(listId) &&
    contact.listIds.includes(listId) &&
    token.added.length > 0 &&
    token.added.every((name) => contact.attributes[name] === true) &&
    modifiedAt >= token.iat * 1000 - MODIFIED_SKEW_MS &&
    modifiedAt >= now - CONFIRMATION_WINDOW_MS
  )
}

/**
 * `GET /api/subscribe/confirmed?t=`, where Brevo sends the reader after the confirmation click. Reads the token and
 * answers 303 to the brand home at once, never cached and never saying why nothing was sent. After the response it
 * checks the contact as Brevo holds it, a few times while Brevo catches up, and emails the team. The brand comes from
 * the Host, as for the signup, and must be the one the token was made on.
 */
export function handleSubscribeConfirmed(request: NextRequest, deps: SubscribeDeps = DEFAULT_DEPS): Response {
  const home = new Response(null, { status: 303, headers: { Location: '/', 'Cache-Control': 'no-store' } })
  const brand = resolveBrandFromHost(request.headers.get('host') ?? '') ?? fallbackBrand(request.cookies.get('brand')?.value)
  const secret = signupNotifySecret()
  const value = request.nextUrl.searchParams.get('t')

  if (!brand || !secret || !value) {
    return home
  }

  const token = readSignupToken(value, secret)

  if (!token || token.brand !== brand) {
    log(brand, 'confirmed: refused token')
    return home
  }

  // Nothing added is never notified, so there is nothing to check.
  if (token.added.length === 0 || !claimToken(value)) {
    return home
  }

  after(async () => {
    const started = Date.now()

    for (const at of CONFIRMATION_ATTEMPTS_MS) {
      await new Promise((resolve) => setTimeout(resolve, Math.max(0, started + at - Date.now())))

      try {
        const [contact, config] = await Promise.all([deps.getContact(token.email), deps.loadConfig(brand)])

        if (shouldNotifyConfirmed(contact, token, config.settings?.listId, Date.now())) {
          await notifySignup({ brand, email: token.email, contact, added: token.added, isNew: token.isNew })
          return
        }
      } catch (error) {
        log(brand, 'confirmed: check failed', error)
      }
    }
  })

  return home
}
