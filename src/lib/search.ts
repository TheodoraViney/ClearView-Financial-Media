import 'server-only'

import { BRANDS, EDITORIAL_BRAND_KEYS, isBrandKey, type BrandKey } from '@/brands'
import { client } from '@/sanity/client'
import { SITE_SEARCH_QUERY } from '@/sanity/queries'

import { formatDateRange, formatLongDate } from './dates'
import { resolveHref, sharedRecordHref } from './links'
import { normalizeSearchTerm, type SearchItem, type SearchSections } from './search-term'

const EMPTY: SearchSections = { posts: [], events: [], awards: [], resources: [] }

/**
 * Header search suggestions for a brand's host: posts, events, awards and resources, matched on the title.
 * The one entry point for search, so the source can move to Algolia without touching the route or the UI.
 *
 * Reads published content without a token through the Sanity API CDN, like the site. Not `cachedSanity`: every term
 * would become its own `'use cache'` entry, and the route's short CDN cache already absorbs repeated terms.
 */
export async function searchSite(q: string | null | undefined, brand: BrandKey): Promise<SearchSections> {
  const term = normalizeSearchTerm(q)

  if (!term) {
    return EMPTY
  }

  const data = await client.fetch(
    SITE_SEARCH_QUERY,
    {
      q: `${term}*`,
      brands: brand === 'clearview' ? EDITORIAL_BRAND_KEYS : [brand],
    },
    { perspective: 'published', stega: false },
  )

  return {
    posts: data.posts.flatMap((post) => {
      const href = resolveHref({ kind: 'internal', internal: { _type: 'post', ...post } }, brand)
      // The brand resolveHref links to off-brand: the first one on the post. Posts never carry the ClearView key.
      const home = post.brands?.find(isBrandKey)
      const meta = brand === 'clearview' ? home && BRANDS[home].title : formatLongDate(post.publishedAt)

      return item(post.title, href, meta)
    }),
    events: data.events.flatMap((event) =>
      item(
        event.title,
        sharedRecordHref('conferenceEvent', event.slug, brand),
        event.hideDateTime ? null : formatDateRange(event.startDate, event.endDate),
      ),
    ),
    awards: data.awards.flatMap((award) =>
      item(
        award.title,
        sharedRecordHref('awardsProgramme', award.slug, brand),
        award.hideDateTime ? null : formatDateRange(award.startDate, award.endDate),
      ),
    ),
    resources: data.resources.flatMap((resource) =>
      item(
        resource.title,
        sharedRecordHref('resource', resource.slug, brand),
        formatLongDate(resource.publishedAt),
      ),
    ),
  }
}

// A record without a title or a route is left out rather than shown unlinked.
function item(
  title: string | null,
  href: string | null,
  meta?: string | null,
): SearchItem[] {
  if (!title || !href) {
    return []
  }

  return [meta ? { title, href, meta } : { title, href }]
}
