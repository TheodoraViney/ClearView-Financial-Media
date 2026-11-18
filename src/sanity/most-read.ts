import { EDITORIAL_BRAND_KEYS, type EditorialBrandKey } from '@/brands'
import { MOST_READ_COUNT } from '@/lib/article-copy'

import { cachedSanity, type DynamicFetchOptions } from './live'
import { MOST_READ_GROUP_LATEST_QUERY, MOST_READ_LATEST_QUERY } from './queries'

/*
 * Most read's auto source: the posts that fill the places the editor's picks leave empty. The brand's latest posts
 * for now. A measured source (GA4 page views) can replace this function later; the adapter merges whatever it
 * returns after the picks, without duplicates and without the article being read.
 */
export async function mostReadAutoFill({
  brand,
  slug,
  ...options
}: { brand: EditorialBrandKey; slug: string } & DynamicFetchOptions) {
  const { data } = await cachedSanity({
    query: MOST_READ_LATEST_QUERY,
    // Enough for a full list even when every pick is among the latest.
    params: { brand, slug, limit: MOST_READ_COUNT * 2 },
    ...options,
  })

  return data ?? []
}

export type MostReadAutoFill = Awaited<ReturnType<typeof mostReadAutoFill>>

/*
 * Most read on a ClearView page (the research report sidebar). ClearView runs no posts of its own, so the list is the
 * group's: the latest posts of the three publications, MOST_READ_COUNT of them, as many as the design shows. No editor
 * picks. Like mostReadAutoFill, this is the swap point for a measured source (GA4 page views across the publications).
 */
export async function mostReadGroupFill(options: DynamicFetchOptions) {
  const { data } = await cachedSanity({
    query: MOST_READ_GROUP_LATEST_QUERY,
    params: { brands: [...EDITORIAL_BRAND_KEYS], limit: MOST_READ_COUNT },
    ...options,
  })

  return data ?? []
}

export type MostReadGroupFill = Awaited<ReturnType<typeof mostReadGroupFill>>
