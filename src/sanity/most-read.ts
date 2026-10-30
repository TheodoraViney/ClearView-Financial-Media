import { type EditorialBrandKey } from '@/brands'
import { MOST_READ_COUNT } from '@/lib/article-copy'

import { cachedSanity, type DynamicFetchOptions } from './live'
import { MOST_READ_LATEST_QUERY } from './queries'

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
