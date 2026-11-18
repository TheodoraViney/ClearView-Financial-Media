'use client'

import { useEffect, useSyncExternalStore } from 'react'

import { AWARDS_LISTING_PATH, EVENT_LISTING_PATHS, RESEARCH_LISTING_PATH, RESEARCH_PREFIX_LISTING_PATH } from '@/lib/links'

/** The ClearView listing a page belongs to, for the header's current-item state. */
export type NavSection = 'awards' | 'events' | 'research'

const LISTING_SECTIONS: [string, NavSection][] = [
  [AWARDS_LISTING_PATH, 'awards'],
  ...Object.values(EVENT_LISTING_PATHS).map((path): [string, NavSection] => [path, 'events']),
  [RESEARCH_LISTING_PATH, 'research'],
]

const within = (path: string, prefix: string) => path === prefix || path.startsWith(`${prefix}/`)

/** The section a link points at: one of the listing paths, else none. */
export function sectionOfHref(href: string): NavSection | null {
  return LISTING_SECTIONS.find(([path]) => path === href)?.[1] ?? null
}

/**
 * The section of a public path, where the path alone tells: the listings (briefings and webinar open the Events tab
 * too), research reports under /resource and award categories under /awards. /events/{slug} serves events and awards
 * editions alike, so those pages declare their section with <CurrentNavSection>.
 */
export function sectionOfPath(path: string): NavSection | null {
  const listing = LISTING_SECTIONS.find(([prefix]) => within(path, prefix))

  if (listing) {
    return listing[1]
  }

  if (within(path, RESEARCH_PREFIX_LISTING_PATH)) {
    return 'research'
  }

  return within(path, '/awards') ? 'awards' : null
}

// The section the current page declared. Module state shared by the page and the header, which sits in the layout
// outside the page's React tree.
let declared: NavSection | null = null
const listeners = new Set<() => void>()

function subscribe(listener: () => void) {
  listeners.add(listener)

  return () => listeners.delete(listener)
}

function setDeclared(section: NavSection | null) {
  declared = section
  listeners.forEach((listener) => listener())
}

/** The section the current page declared with <CurrentNavSection>, or null. */
export function useDeclaredNavSection(): NavSection | null {
  return useSyncExternalStore(
    subscribe,
    () => declared,
    () => null,
  )
}

/** Marks the page as part of a section in the header while it is mounted; renders nothing. */
export function CurrentNavSection({ section }: { section: NavSection }) {
  useEffect(() => {
    setDeclared(section)

    return () => setDeclared(null)
  }, [section])

  return null
}
