import 'server-only'

import type { BrevoContact } from './brevo'
import { SUBSCRIBE_OPTION_ATTRIBUTES } from './subscribe'

/**
 * What the signup server (src/lib/subscribe-server.ts) and the team's signup notification
 * (src/lib/signup-notification.ts) both read on a Brevo contact.
 */

// Brevo attribute names the server sets itself. Structure, not copy.
export const ATTRIBUTE = {
  firstName: 'FIRSTNAME',
  lastName: 'LASTNAME',
  company: 'COMPANY_NAME',
  jobTitle: 'JOB_TITLE',
  ...SUBSCRIBE_OPTION_ATTRIBUTES,
  consent: 'GDPR_CONSENT',
  source: 'SOURCE',
  doubleOptIn: 'DOUBLE_OPT-IN',
} as const

/** Brevo's value of DOUBLE_OPT-IN once a contact has clicked a confirmation email. */
const DOUBLE_OPT_IN_CONFIRMED = '1'

/** Confirmed once before, by any double opt-in, and still reachable. Only those can skip the confirmation email. */
export const isConfirmed = (contact: BrevoContact | null): contact is BrevoContact =>
  contact !== null && contact.attributes[ATTRIBUTE.doubleOptIn] === DOUBLE_OPT_IN_CONFIRMED && !contact.emailBlacklisted

/** Masks every email address in a log line. */
export const maskEmails = (text: string) => text.replace(/[^\s@"'<>]+@[^\s@"'<>]+/g, '[email]')
