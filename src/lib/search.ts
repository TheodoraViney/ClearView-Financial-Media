import 'server-only'

import { isBrandKey, type BrandKey } from '@/brands'
import { brandTitle } from '@/sanity/brand-title'

import { algoliaSearch } from './algolia'
import { archiveArticlePath, archiveCanonicalUrl } from './archive'
import { formatDateRange, formatLongDate } from './dates'
import { resolveHref, sharedRecordHref } from './links'
import { SEARCH_INDEX, type SearchRecord } from './search-index'
import { brandFilter } from './search-query'
import { normalizeSearchTerm, type SearchItem, type SearchSections } from './search-term'

const EMPTY: SearchSections = { posts: [], events: [], awards: [], resources: [] }

/** Suggestions per section: articles (posts and the archive together), and the shared records. */
const LIMITS: Record<keyof SearchSections, number> = { posts: 5, events: 3, awards: 3, resources: 3 }

/**
 * Header search suggestions for a brand's host from the Algolia index (src/lib/search-index.ts): articles, archived
 * and from the CMS, events, awards and resources.
 *
 * ClearView searches the articles of all three publications, a publication host its own; events, awards and resources
 * show on every host. One query answers all four sections: `distinct` on the section caps each group at 5, so a
 * keystroke costs one billed search request. The route's short CDN cache absorbs repeated terms.
 */
export async function searchSite(q: string | null | undefined, brand: BrandKey): Promise<SearchSections> {
  const term = normalizeSearchTerm(q)

  if (!term) {
    return EMPTY
  }

  const { hits } = await algoliaSearch<SearchRecord>(SEARCH_INDEX, {
    query: term,
    hitsPerPage: 20,
    distinct: LIMITS.posts,
    filters: brandFilter(brand) ?? undefined,
  })

  const sections: SearchSections = { posts: [], events: [], awards: [], resources: [] }

  for (const hit of hits) {
    const list = sections[hit.section]

    if (list && list.length < LIMITS[hit.section]) {
      list.push(...toItem(hit, brand))
    }
  }

  return sections
}

/**
 * The URL of a search hit on a brand's host, or null when it has no route. An archived article opens on its home
 * publication from ClearView and on the current host elsewhere; a post as resolveHref links it; events, awards and
 * resources on ClearView.
 */
export function searchHitHref(
  hit: Pick<SearchRecord, 'kind' | 'slug' | 'publications' | 'archiveId'>,
  brand: BrandKey,
): string | null {
  switch (hit.kind) {
    case 'archive': {
      if (!hit.archiveId) {
        return null
      }

      const record = { id: hit.archiveId, slug: hit.slug, publications: hit.publications }

      return brand === 'clearview' ? archiveCanonicalUrl(record, brand) : archiveArticlePath(record)
    }
    case 'post':
      return resolveHref(
        { kind: 'internal', internal: { _type: 'post', slug: hit.slug, brands: hit.publications } },
        brand,
      )
    case 'conferenceEvent':
    case 'awardsProgramme':
    case 'resource':
      return sharedRecordHref(hit.kind, hit.slug, brand)
    default:
      return null
  }
}

function toItem(hit: SearchRecord, brand: BrandKey): SearchItem[] {
  const href = searchHitHref(hit, brand)

  switch (hit.kind) {
    case 'archive':
    case 'post':
      return item(hit.title, href, articleMeta(hit, brand))
    case 'conferenceEvent':
    case 'awardsProgramme':
      return item(hit.title, href, hit.hideDateTime ? null : formatDateRange(hit.date, hit.endDate))
    case 'resource':
      return item(hit.title, href, formatLongDate(hit.date))
    default:
      return []
  }
}

/** The publication on ClearView, which lists all three; the date on a publication host. */
function articleMeta(hit: SearchRecord, brand: BrandKey): string | null {
  return brand === 'clearview' ? homePublicationTitle(hit.publications) : formatLongDate(hit.date)
}

/** The name of an article's home publication, the first valid brand key; null when it has none. */
export function homePublicationTitle(publications: string[]): string | null {
  const home = publications.find(isBrandKey)

  return home ? brandTitle(home, null) : null
}

// A record without a title or a route is left out rather than shown unlinked.
function item(title: string | null, href: string | null, meta?: string | null): SearchItem[] {
  if (!title || !href) {
    return []
  }

  return [meta ? { title, href, meta } : { title, href }]
}
