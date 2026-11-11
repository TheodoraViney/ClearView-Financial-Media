import 'server-only'

import type { BrandKey } from '@/brands'

import { algoliaMultiSearch } from './algolia'
import { formatDateRange, formatLongDate } from './dates'
import { homePublicationTitle, searchHitHref } from './search'
import type { SearchImage, SearchRecord } from './search-index'
import { SECTION_SEARCH_TYPES, type SearchState, type SearchType } from './search-page'
import { foldSearchResults, searchQueries, type SearchCounts } from './search-query'

export type SearchResultItem = {
  id: string
  type: SearchType
  title: string
  href: string
  /** The standfirst, else the start of the body. */
  summary: string | null
  /** The publication date, or an event's or awards edition's date range; null when undated or hidden. */
  date: string | null
  /** The card's meta after the date, in order: the publication (ClearView articles), category, event type, location. */
  meta: string[]
  image: SearchImage | null
  imageFit?: 'contain'
}

export type SearchResultsView = {
  total: number
  page: number
  /** Pages the reader can open. A `page` above it gets an empty `items`, and the page answers 404. */
  pages: number
  /** Type chip counts for the term on this host, whatever type and years are selected. */
  counts: SearchCounts
  /** Years with results for the term and the selected type, newest first. */
  yearOptions: { value: string; count: number }[]
  items: SearchResultItem[]
}

/**
 * The search results page for a brand's host from the Algolia index (src/lib/search-index.ts), or null without a
 * term, which sends no query. The queries (src/lib/search-query.ts) go out in one call: one billed search without a
 * type or year filter, two or three with them.
 */
export async function searchResults(state: SearchState, brand: BrandKey): Promise<SearchResultsView | null> {
  const { q } = state

  if (!q) {
    return null
  }

  const results = await algoliaMultiSearch<SearchRecord>(searchQueries({ ...state, q }, brand))
  const { hits, ...fold } = foldSearchResults(state, results)

  return {
    ...fold,
    page: state.page,
    items: state.page > fold.pages ? [] : hits.flatMap((hit) => toResult(hit, brand)),
  }
}

// A hit without a title, a route or a known section is left out rather than shown unlinked.
function toResult(hit: SearchRecord, brand: BrandKey): SearchResultItem[] {
  const type = SECTION_SEARCH_TYPES[hit.section]
  const href = searchHitHref(hit, brand)

  if (!type || !hit.title || !href) {
    return []
  }

  const shared = type === 'event' || type === 'award'
  const meta =
    type === 'article'
      ? [brand === 'clearview' ? homePublicationTitle(hit.publications) : null, hit.category, hit.location]
      : type === 'event'
        ? [hit.eventType, hit.location]
        : type === 'award'
          ? [hit.location]
          : []

  return [
    {
      id: hit.objectID,
      type,
      title: hit.title,
      href,
      summary: hit.standfirst ?? hit.extract ?? null,
      date: shared ? (hit.hideDateTime ? null : formatDateRange(hit.date, hit.endDate)) : formatLongDate(hit.date),
      meta: meta.filter((value): value is string => Boolean(value)),
      image: hit.image ?? null,
      ...(hit.imageFit ? { imageFit: hit.imageFit } : {}),
    },
  ]
}
