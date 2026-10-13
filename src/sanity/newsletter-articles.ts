import type { SanityClient } from '@sanity/client'

import { brandDocumentId, type EditorialBrandKey } from '@/brands'

import { NEWSLETTER_ARTICLES_PER_ISSUE_QUERY, NEWSLETTER_LATEST_POST_IDS_QUERY } from './queries'

/**
 * The articles a newsletter issue starts with, shared by the `newsletter-issue-by-brand` template (prefill on create)
 * and the Refresh articles action. Studio only: both run with the signed-in user's client.
 */

// Used when Brand settings → Newsletter → Articles per issue is unset.
export const DEFAULT_ARTICLES_PER_ISSUE = 4

/** Brand settings → Newsletter → Articles per issue, or the default when unset. */
export async function fetchArticlesPerIssue(client: SanityClient, brand: EditorialBrandKey): Promise<number> {
  const value = await client.fetch(
    NEWSLETTER_ARTICLES_PER_ISSUE_QUERY,
    { brand, brandId: brandDocumentId(brand) },
    { perspective: 'published' },
  )

  // The field allows 1–20, the same cap as NEWSLETTER_LATEST_POST_IDS_QUERY.
  return typeof value === 'number' && value >= 1 ? Math.min(Math.floor(value), 20) : DEFAULT_ARTICLES_PER_ISSUE
}

/** Ids of the brand's `count` latest published posts, newest first. Fewer when the brand has fewer. */
export async function fetchLatestPostIds(
  client: SanityClient,
  { brand, count }: { brand: EditorialBrandKey; count: number },
): Promise<string[]> {
  const ids = await client.fetch(NEWSLETTER_LATEST_POST_IDS_QUERY, { brand }, { perspective: 'published' })

  return ids.slice(0, count)
}

function randomKey(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(6))
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
}

/** Items of the issue's `posts` array: one reference per post id, each with its own `_key`. */
export const postReferences = (ids: string[]) =>
  ids.map((id) => ({ _type: 'reference' as const, _ref: id, _key: randomKey() }))
