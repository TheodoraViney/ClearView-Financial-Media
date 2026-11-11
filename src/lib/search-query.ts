// The Algolia queries behind the search results page, and how their responses fold into hits and filter counts.
// No server imports here, so a script can run it under bun; src/lib/search-results.ts sends the queries.

import type { BrandKey } from '@/brands'

import type { AlgoliaQuery, AlgoliaResult } from './algolia'
import { SEARCH_INDEX, type SearchRecord, type SearchSection } from './search-index'
import {
  SEARCH_MAX_PAGE,
  SEARCH_PAGE_SIZE,
  SEARCH_TYPE_SECTIONS,
  SECTION_SEARCH_TYPES,
  type SearchState,
  type SearchType,
} from './search-page'

/** What a result card reads from a hit. The settings' own list is the header suggestions'. */
const RESULT_ATTRIBUTES = [
  'kind',
  'section',
  'title',
  'standfirst',
  'extract',
  'publications',
  'slug',
  'archiveId',
  'date',
  'endDate',
  'hideDateTime',
  'image',
  'imageFit',
  'category',
  'location',
  'eventType',
]

/**
 * The records a brand's host searches, as in the header suggestions: ClearView every article, a publication host its
 * own; events, awards and resources on every host. Null on ClearView, which needs no filter.
 */
export function brandFilter(brand: BrandKey): string | null {
  return brand === 'clearview'
    ? null
    : `(publications:${brand} OR section:events OR section:awards OR section:resources)`
}

const typeFilter = (type: SearchType | null) => (type ? `section:${SEARCH_TYPE_SECTIONS[type]}` : null)

const yearsFilter = (years: string[]) =>
  years.length ? `(${years.map((year) => `year:"${year}"`).join(' OR ')})` : null

const filters = (...parts: (string | null)[]) => parts.filter(Boolean).join(' AND ') || undefined

/** Facet counts only: no hits. */
const countsQuery = (query: string, filter: string | undefined, facets: string[]): AlgoliaQuery => ({
  indexName: SEARCH_INDEX,
  query,
  filters: filter,
  facets,
  hitsPerPage: 0,
  distinct: false,
  attributesToRetrieve: [],
  attributesToHighlight: [],
  analytics: false,
})

/**
 * The queries for a state with a term, sent in one call. Relevance ranks the hits, the newer first among equals (the
 * index's custom ranking); `distinct` is off, it serves the header suggestions only.
 *
 * - No type and no year: one query gives the hits and both facets.
 * - Otherwise the hits query takes every filter, and a brand-only query gives the type chip counts, which ignore the
 *   type and the years. Year options follow the term and the type but not the selected years, so with years selected
 *   they come from the brand-only query (no type) or from a third query on the term and type.
 */
export function searchQueries(state: SearchState & { q: string }, brand: BrandKey): AlgoliaQuery[] {
  const base = brandFilter(brand)
  const narrowed = Boolean(state.type || state.years.length)
  const hits: AlgoliaQuery = {
    indexName: SEARCH_INDEX,
    query: state.q,
    filters: filters(base, typeFilter(state.type), yearsFilter(state.years)),
    facets: !narrowed ? ['section', 'year'] : state.years.length ? [] : ['year'],
    hitsPerPage: SEARCH_PAGE_SIZE,
    // Past the 1,000th hit Algolia answers with no hits, which leaves the page to 404.
    page: state.page - 1,
    distinct: false,
    attributesToRetrieve: RESULT_ATTRIBUTES,
    attributesToHighlight: [],
  }

  if (!narrowed) {
    return [hits]
  }

  const queries = [hits, countsQuery(state.q, filters(base), state.type ? ['section'] : ['section', 'year'])]

  if (state.type && state.years.length) {
    queries.push(countsQuery(state.q, filters(base, typeFilter(state.type)), ['year']))
  }

  return queries
}

export type SearchCounts = Record<'all' | SearchType, number>

export type SearchFold = {
  /** Hits matching every filter: the result count shown, though only the first 1,000 can be paged to. */
  total: number
  /** Pages the reader can open, at most SEARCH_MAX_PAGE. */
  pages: number
  counts: SearchCounts
  /** Years with hits for the term and type, newest first. */
  yearOptions: { value: string; count: number }[]
  hits: AlgoliaResult<SearchRecord>['hits']
}

/** The responses of searchQueries, in its order, as hits and filter counts. */
export function foldSearchResults(state: SearchState, results: AlgoliaResult<SearchRecord>[]): SearchFold {
  const [hits, brandOnly, typeOnly] = results
  const narrowed = Boolean(state.type || state.years.length)
  const chips = narrowed ? brandOnly : hits
  const years = !state.years.length ? hits : state.type ? typeOnly : brandOnly
  const counts: SearchCounts = { all: chips.nbHits, article: 0, award: 0, event: 0, research: 0 }

  for (const [section, count] of Object.entries(chips.facets?.section ?? {})) {
    const type = SECTION_SEARCH_TYPES[section as SearchSection]

    if (type) {
      counts[type] = count
    }
  }

  return {
    total: hits.nbHits,
    pages: Math.min(Math.ceil(hits.nbHits / SEARCH_PAGE_SIZE), SEARCH_MAX_PAGE),
    counts,
    yearOptions: Object.entries(years?.facets?.year ?? {})
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => b.value.localeCompare(a.value)),
    hits: hits.hits,
  }
}
