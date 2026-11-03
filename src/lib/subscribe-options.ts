import 'server-only'

import { cacheLife } from 'next/cache'

import { listAttributeOptions } from './brevo'
import { SUBSCRIBE_OPTION_ATTRIBUTES } from './subscribe'

/**
 * The pop-up's Country and Industry lists, straight from Brevo's COUNTRY and INDUSTRY_TYPE options: each option's
 * text is both what readers see and the value the contact gets. Countries A–Z; industries in Brevo's order, Other
 * last. An empty list hides its field.
 */
export type SubscribeOptions = { countries: string[]; industries: string[] }

export const NO_OPTIONS: SubscribeOptions = { countries: [], industries: [] }

const byText = (a: string, b: string) => a.localeCompare(b, 'en', { sensitivity: 'base' })

const isOther = (value: string) => value.trim().toLowerCase() === 'other'

/**
 * Cached for hours, so pages and the subscribe route share one Brevo read per instance. A failure throws and is not
 * cached; `subscribeOptions` turns it into empty lists.
 */
async function cachedSubscribeOptions(): Promise<SubscribeOptions> {
  'use cache'
  cacheLife('hours')

  const options = await listAttributeOptions(Object.values(SUBSCRIBE_OPTION_ATTRIBUTES))

  return orderSubscribeOptions({
    countries: options[SUBSCRIBE_OPTION_ATTRIBUTES.country] ?? [],
    industries: options[SUBSCRIBE_OPTION_ATTRIBUTES.industry] ?? [],
  })
}

/** Countries A–Z; industries in Brevo's order with Other last. */
export function orderSubscribeOptions({ countries, industries }: SubscribeOptions): SubscribeOptions {
  return {
    countries: [...countries].sort(byText),
    industries: [...industries.filter((value) => !isOther(value)), ...industries.filter(isOther)],
  }
}

/** The Country and Industry lists, or empty lists when Brevo cannot be read: the fields are hidden, the page renders. */
export async function subscribeOptions(): Promise<SubscribeOptions> {
  try {
    return await cachedSubscribeOptions()
  } catch (error) {
    console.error('[subscribe] reading the Country and Industry options from Brevo failed:', error instanceof Error ? error.message : error)
    return NO_OPTIONS
  }
}
