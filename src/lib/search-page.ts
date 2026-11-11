/*
 * The search results page and its URL state, shared by the server page and the filter controls.
 * Pure: no Sanity, Next or server imports, so a client component can build the same hrefs.
 *
 * URL state: `q` (the term, as the header search normalises it), `type` (one of SEARCH_TYPES; absent: all), `year`
 * (repeats, or a comma list; OR within years) and `page` (2 and up; absent: 1). Unknown or malformed values are
 * dropped silently, as on the Categories page.
 */

import type { SearchSection } from './search-index'
import { normalizeSearchTerm } from './search-term'

export const SEARCH_PATH = '/search'

/** Result cards per page. */
export const SEARCH_PAGE_SIZE = 16

/**
 * The last page that can hold results. Algolia serves the first 1,000 hits of a query (`paginationLimitedTo`), so
 * past 62 full pages the 63rd holds the remaining 8 and nothing comes after it.
 */
export const SEARCH_MAX_PAGE = Math.ceil(1000 / SEARCH_PAGE_SIZE)

/** The result types a reader filters by, in chip order. */
export const SEARCH_TYPES = ['article', 'award', 'event', 'research'] as const

export type SearchType = (typeof SEARCH_TYPES)[number]

/** The index section of each type: articles are posts and the archive together, research is the resources. */
export const SEARCH_TYPE_SECTIONS: Record<SearchType, SearchSection> = {
  article: 'posts',
  award: 'awards',
  event: 'events',
  research: 'resources',
}

export const SECTION_SEARCH_TYPES: Record<SearchSection, SearchType> = {
  posts: 'article',
  awards: 'award',
  events: 'event',
  resources: 'research',
}

export type SearchState = {
  /** The normalised term, or null when there is none or it is out of range: then nothing is searched. */
  q: string | null
  type: SearchType | null
  /** Four-digit years, newest first. */
  years: string[]
  page: number
}

export type RawSearchParams = Record<string, string | string[] | undefined>

// Enough for any real selection; a longer list in a crafted URL is cut, not an error.
const MAX_YEARS = 10
const YEAR_PATTERN = /^\d{4}$/
// No leading zeros or signs, so one page has one URL.
const PAGE_PATTERN = /^[1-9]\d{0,5}$/

const values = (value: string | string[] | undefined): string[] =>
  value === undefined ? [] : Array.isArray(value) ? value : [value]

const isSearchType = (value: string | undefined): value is SearchType =>
  (SEARCH_TYPES as readonly string[]).includes(value ?? '')

/** The URL state. An invalid page reads as page 1; a page past the last is the page's to answer with a 404. */
export function parseSearchState(params: RawSearchParams): SearchState {
  const type = values(params.type)[0]
  const page = values(params.page)[0]
  const years = values(params.year)
    .flatMap((value) => value.split(','))
    .map((year) => year.trim())
    .filter((year) => YEAR_PATTERN.test(year))

  return {
    q: normalizeSearchTerm(values(params.q)[0]),
    type: isSearchType(type) ? type : null,
    years: [...new Set(years)].sort((a, b) => b.localeCompare(a)).slice(0, MAX_YEARS),
    page: page && PAGE_PATTERN.test(page) ? Number(page) : 1,
  }
}

/** The page's URL for a state, parameters in a fixed order so one state has one URL. */
export function searchHref(state: SearchState): string {
  const params = new URLSearchParams()

  if (state.q) {
    params.set('q', state.q)
  }

  if (state.type) {
    params.set('type', state.type)
  }

  state.years.forEach((year) => params.append('year', year))

  if (state.page > 1) {
    params.set('page', String(state.page))
  }

  const query = params.toString()

  return query ? `${SEARCH_PATH}?${query}` : SEARCH_PATH
}
