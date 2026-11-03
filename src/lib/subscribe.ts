import { HONEYPOT_FIELD } from './honeypot'

/**
 * Shared constants and types of the subscribe pop-up, for the Studio schema, the site and the server. Pure: no
 * server-only code.
 */

/** The Brevo multiple-choice attributes whose options the pop-up offers, read from Brevo itself. Structure, not copy. */
export const SUBSCRIBE_OPTION_ATTRIBUTES = { country: 'COUNTRY', industry: 'INDUSTRY_TYPE' } as const

/** Most interests one pop-up can offer. */
export const SUBSCRIBE_INTERESTS_MAX = 8

/** Where the Privacy Policy link goes in the consent text. */
export const CONSENT_LINK_TOKEN = '{link}'

/** The pop-up's copy fields, each a required string of its document. */
export const SUBSCRIBE_MODAL_TEXT_FIELDS = [
  'title',
  'description',
  'firstNameLabel',
  'lastNameLabel',
  'emailLabel',
  'emailPlaceholder',
  'companyLabel',
  'jobTitleLabel',
  'countryLabel',
  'countryPlaceholder',
  'industryLabel',
  'industryPlaceholder',
  'optionalMarker',
  'requiredMarker',
  'interestsLegend',
  'consentText',
  'privacyLinkLabel',
  'submitLabel',
  'firstNameError',
  'lastNameError',
  'emailMissingError',
  'emailInvalidError',
  'consentError',
  'noPublicationError',
  'genericError',
  'successTitle',
  'successText',
  'closeLabel',
] as const

export type SubscribeModalTextField = (typeof SUBSCRIBE_MODAL_TEXT_FIELDS)[number]

/** Longest value of each text field, in characters: the inputs' maxLength and the server's limit. */
export const SUBSCRIBE_MAX_LENGTH = {
  firstName: 100,
  lastName: 100,
  email: 254,
  company: 200,
  jobTitle: 200,
} as const

// Something@something.something, no spaces, at most the input's maxLength, as the server checks it. Brevo has the final
// word.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export const isEmailAddress = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length <= SUBSCRIBE_MAX_LENGTH.email && EMAIL_PATTERN.test(value.trim())

// ---------------------------------------------------------------------------------------------------------------
// The pop-up's request and answer, shared by the browser form and the `POST /api/subscribe` route.

export const SUBSCRIBE_ENDPOINT = '/api/subscribe'

/**
 * What the pop-up posts, as JSON. Interests travel as Sanity `_key`s, never as Brevo names: the server maps them back
 * from the brand's pop-up document. Country and industry are Brevo's own option texts, checked against Brevo's lists.
 * The brand comes from the Host, never from the body. Empty optional fields are left out.
 */
export type SubscribeRequest = {
  firstName: string
  lastName: string
  email: string
  company?: string
  jobTitle?: string
  /** One of Brevo's COUNTRY options. */
  country?: string
  /** One of Brevo's INDUSTRY_TYPE options. */
  industry?: string
  /** `_key`s of the ticked interests of the brand's pop-up, the always ticked ones included. */
  interests: string[]
  consent: boolean
} & {
  /** The honeypot: empty for people. */
  [HONEYPOT_FIELD]?: string
}

/** Fields the server can reject; each maps to that field's CMS error. */
export type SubscribeField = 'firstName' | 'lastName' | 'email' | 'interests' | 'consent'

/**
 * The route's answer. Success reads the same whether or not a confirmation email went out, so the answer says nothing
 * about the address. Any other failure, a firewall 429 included, reads as `failed`.
 */
export type SubscribeResponse =
  | { status: 'success' }
  | { status: 'error'; reason: 'invalid'; fields: SubscribeField[] }
  | { status: 'error'; reason: 'invalid-email' }
  | { status: 'error'; reason: 'failed' }
