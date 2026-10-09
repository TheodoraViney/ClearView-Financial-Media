import 'server-only'

import { BrevoError } from './brevo'

/**
 * Shared server helpers for the site's forms. Rate limiting is deliberately not done here:
 * the contract puts it in the Vercel firewall, in front of every form action.
 */

export type FormResult = { status: 'idle' } | { status: 'success' } | { status: 'error'; reason: 'invalid-email' | 'failed' }

// Something@something.something, no spaces, as in the client check. Brevo has the final word.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export const isEmail = (value: FormDataEntryValue | null): value is string =>
  typeof value === 'string' && EMAIL_PATTERN.test(value.trim())

/** Name of the hidden field people never see. Bots that fill every input fill this one too. */
export const HONEYPOT_FIELD = 'company_website'

/** True when the honeypot is filled. Callers answer success without sending anything, so the bot learns nothing. */
export const isBot = (formData: FormData) => {
  const value = formData.get(HONEYPOT_FIELD)

  return typeof value === 'string' && value.trim() !== ''
}

/** Logs a failed send on the server and turns it into the generic answer the visitor sees. Never logs the key. */
export function failed(context: string, error: unknown): FormResult {
  if (error instanceof BrevoError) {
    console.error(`[forms] ${context}: Brevo ${error.status} ${error.code ?? ''} ${error.message}`)
  } else {
    console.error(`[forms] ${context}:`, error instanceof Error ? error.message : error)
  }

  return { status: 'error', reason: 'failed' }
}
