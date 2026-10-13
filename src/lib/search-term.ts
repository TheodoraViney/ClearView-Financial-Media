// What the header search sends and receives, shared by searchSite (server) and the suggestions popup (client).
// No server imports here, so the client bundle can use it.

/** Shortest and longest term searched. Anything outside the range returns empty sections without a query. */
export const SEARCH_MIN_LENGTH = 2
export const SEARCH_MAX_LENGTH = 100

/**
 * Default visible copy of the suggestions popup: the `initialValue` of the header's Search suggestions fields, and the
 * fallback while a header document has no value yet.
 */
export const SEARCH_LABEL_DEFAULTS = {
  articles: 'Articles',
  events: 'Events',
  awards: 'Awards',
  resources: 'Resources',
  nothingFound: 'Nothing found',
} as const

export type SearchItem = {
  title: string
  href: string
  /** The publication on ClearView posts, else the date. */
  meta?: string
}

export type SearchSections = {
  posts: SearchItem[]
  events: SearchItem[]
  awards: SearchItem[]
  resources: SearchItem[]
}

/** The term as searched: trimmed, or null when it is too short or too long. */
export function normalizeSearchTerm(value: string | null | undefined): string | null {
  const term = value?.trim() ?? ''

  return term.length >= SEARCH_MIN_LENGTH && term.length <= SEARCH_MAX_LENGTH ? term : null
}
