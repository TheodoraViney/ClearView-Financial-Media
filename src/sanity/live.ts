import { cookies, draftMode } from 'next/headers'
import {
  defineLive,
  resolvePerspectiveFromCookies,
  resolveVariantFromCookies,
  type LivePerspective,
  type StrictDefinedFetchType,
} from 'next-sanity/live'

import { client } from './client'

const token = process.env.SANITY_API_READ_TOKEN

export const { sanityFetch, SanityLive } = defineLive({
  client,
  browserToken: token,
  serverToken: token,
  strict: true,
})

// sanityFetch calls cacheTag/cacheLife internally but creates no boundary, so this wrapper is the app's only one and callers must not add their own.
export const cachedSanity: StrictDefinedFetchType = async (options) => {
  'use cache'
  return sanityFetch(options)
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
