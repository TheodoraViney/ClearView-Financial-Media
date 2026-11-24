import type { RawSearchParams, SharedListingsTab } from './shared-listings'

/*
 * AWARDS-LIST-VARIANTS (temporary): three display variants of the Awards tab list, for the client to choose from.
 * `?view=icon` adds the edition logo to each row, `?view=grid` shows compact cards; no `view` (or any other value)
 * is the plain list. Only the Awards tab reads it; the pagination links, Clear filters and the filter form keep it.
 * Canonical and indexing ignore it: listingCanonical builds the canonical without `view`, so a variant URL points at
 * the plain list.
 * To keep one variant: delete this file and every line marked `AWARDS-LIST-VARIANTS (temporary)` (grep for it), and
 * render the chosen variant's component in place of the list in src/components/sections/listings/RecordListing.tsx.
 */

/** The URL parameter that picks the variant. */
export const AWARDS_LIST_VIEW_PARAM = 'view'

const AWARDS_LIST_VIEWS = ['icon', 'grid'] as const

/** The variant shown: null is the plain list. */
export type AwardsListView = (typeof AWARDS_LIST_VIEWS)[number] | null

/** The variant the URL asks for, on the Awards tab only; anything unknown is the plain list. */
export function parseAwardsListView(tab: SharedListingsTab, params: RawSearchParams): AwardsListView {
  const raw = params[AWARDS_LIST_VIEW_PARAM]
  const value = Array.isArray(raw) ? raw[0] : raw

  return tab === 'awards' && (AWARDS_LIST_VIEWS as readonly string[]).includes(value ?? '')
    ? (value as AwardsListView)
    : null
}

/** A listing URL with the variant kept, last in the query string. */
export function withAwardsListView(href: string, view: AwardsListView): string {
  if (!view) {
    return href
  }

  return `${href}${href.includes('?') ? '&' : '?'}${AWARDS_LIST_VIEW_PARAM}=${view}`
}
