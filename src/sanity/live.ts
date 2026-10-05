import { cacheLife } from 'next/cache'
import { cookies, draftMode } from 'next/headers'
import {
  defineLive,
  resolvePerspectiveFromCookies,
  resolveVariantFromCookies,
  type LivePerspective,
  type StrictDefinedFetchType,
} from 'next-sanity/live'

import { ukToday } from '@/lib/dates'

import { client } from './client'

const token = process.env.SANITY_API_READ_TOKEN

export const { sanityFetch, SanityLive } = defineLive({
  client,
  browserToken: token,
  serverToken: token,
  strict: true,
})

// sanityFetch calls cacheTag/cacheLife internally but creates no boundary, so this wrapper is the app's only one for content and callers must not add their own.
export const cachedSanity: StrictDefinedFetchType = async (options) => {
  'use cache'
  return sanityFetch(options)
}

/**
 * Today's UK date for date-filtered queries (`$today`), e.g. the highlights fill.
 *
 * A param rather than now() in GROQ, so it joins cachedSanity's cache key and the result changes once a day.
 * `new Date()` cannot run uncached in a prerendered page, so it sits in its own boundary. The `hours` profile
 * caps the prerendered page at an hourly revalidate (365 days otherwise), so the date rolls over within the
 * hour after UK midnight while Sanity Live keeps expiring content changes as before.
 */
export async function cachedUkToday(): Promise<string> {
  'use cache'
  cacheLife('hours')
  return ukToday()
}

export interface DynamicFetchOptions {
  perspective: LivePerspective
  variant?: string
  stega: boolean
}

export async function getDynamicFetchOptions(): Promise<DynamicFetchOptions> {
  const { isEnabled: isDraftMode } = await draftMode()
  if (!isDraftMode) {
    return { perspective: 'published', stega: false }
  }

  const jar = await cookies()
  const perspective = await resolvePerspectiveFromCookies({ cookies: jar })
  const variant = await resolveVariantFromCookies({ cookies: jar })
  return { perspective: perspective ?? 'drafts', variant, stega: true }
}
