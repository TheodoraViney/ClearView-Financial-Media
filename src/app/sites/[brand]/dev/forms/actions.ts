'use server'

import { brandOrigin } from '@/brands'
import { upsertContact } from '@/lib/brevo'
import { failed, isBot, isEmail, type FormResult } from '@/lib/forms'
import { isEditorialBrand, publicationListId, subscribeToPublication } from '@/lib/newsletter'

// Actions for the dev forms page. A server action is a public POST endpoint even where its page 404s,
// so each one checks for itself that it may run: only in development or staging.

// Allow-list, not a production check: an unset or misspelled env must keep the actions off.
function devAllowed() {
  const env = process.env.NEXT_PUBLIC_SITE_ENV

  return env === 'development' || env === 'staging'
}

const text = (value: FormDataEntryValue | null) => (typeof value === 'string' ? value.trim() : '')

// The tester picks the publication in the form. Safe only because it is checked against EDITORIAL_BRAND_KEYS
// and does nothing but choose whose Brand settings to read: list and template ids never come from the browser.
function publication(formData: FormData) {
  const value = text(formData.get('publication'))

  return isEditorialBrand(value) ? value : null
}

export async function subscribeAction(_previous: FormResult, formData: FormData): Promise<FormResult> {
  if (!devAllowed()) {
    return { status: 'error', reason: 'failed' }
  }

  if (isBot(formData)) {
    return { status: 'success' }
  }

  const brand = publication(formData)
  if (!brand) {
    return { status: 'error', reason: 'failed' }
  }

  const email = formData.get('email')
  if (!isEmail(email)) {
    return { status: 'error', reason: 'invalid-email' }
  }

  // No SOURCE or other multiple-choice attributes yet: a value Brevo does not know fails the whole request.
  const firstName = text(formData.get('firstName'))

  try {
    await subscribeToPublication({
      brand,
      email: email.trim(),
      attributes: firstName ? { FIRSTNAME: firstName } : undefined,
      redirectionUrl: `${brandOrigin(brand)}/dev/forms?confirmed=1`,
    })
  } catch (error) {
    return failed('dev subscribe', error)
  }

  return { status: 'success' }
}

export async function upsertAction(_previous: FormResult, formData: FormData): Promise<FormResult> {
  if (!devAllowed()) {
    return { status: 'error', reason: 'failed' }
  }

  if (isBot(formData)) {
    return { status: 'success' }
  }

  const brand = publication(formData)
  if (!brand) {
    return { status: 'error', reason: 'failed' }
  }

  const email = formData.get('email')
  if (!isEmail(email)) {
    return { status: 'error', reason: 'invalid-email' }
  }

  const firstName = text(formData.get('firstName'))

  try {
    // Dev test only: with no dev list any more, the upsert reuses the selected publication's newsletter list.
    // Real lead and download forms will get lists of their own and must not add contacts to a newsletter without consent.
    await upsertContact({
      email: email.trim(),
      attributes: firstName ? { FIRSTNAME: firstName } : undefined,
      listIds: [await publicationListId(brand)],
    })
  } catch (error) {
    return failed('dev upsert', error)
  }

  return { status: 'success' }
}
