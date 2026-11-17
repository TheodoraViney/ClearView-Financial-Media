import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { AWARDS_LISTING_PATH, EVENT_LISTING_PATHS } from '@/lib/links'
import { EVENTS_CATEGORIES, eventsCategoryTab, isEventsCategory, type RawSearchParams } from '@/lib/shared-listings'
import { SharedListingsRoute, sharedListingsMetadata } from '@/sanity/shared-listings-route'

// The shared listings page at the legacy clearviewpublishing.com paths /events-category/{category}: `awards` opens the
// Awards tab; `summits`, `briefings` and `webinar` (EVENT_LISTING_PATHS) open the Events tab, which lists every
// conference event whatever its type. Any other category is a 404, as is every host but ClearView.
//
// A blocking route, like the Categories page: the list depends on searchParams, so nothing of it prerenders. The
// query stays cached per tab by cachedSanity; the filters are applied to the cached result. The 404 is intended, so
// the route opts out of instant-navigation validation.
export const instant = false

type Props = {
  params: Promise<{ brand: string; category: string }>
  searchParams: Promise<RawSearchParams>
}

// The four categories are known; any other renders on demand and 404s.
export function generateStaticParams() {
  return EVENTS_CATEGORIES.map((category) => ({ category }))
}

// Each category's own path, the canonical of its unfiltered view.
const PATHS = {
  awards: AWARDS_LISTING_PATH,
  summits: EVENT_LISTING_PATHS.summit,
  briefings: EVENT_LISTING_PATHS.briefing,
  webinar: EVENT_LISTING_PATHS.webinar,
} as const

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { brand, category } = await params

  if (brand !== 'clearview' || !isEventsCategory(category)) {
    return {}
  }

  return sharedListingsMetadata({ tab: eventsCategoryTab(category), path: PATHS[category], searchParams: await searchParams })
}

export default async function EventsCategoryRoute({ params, searchParams }: Props) {
  const { brand, category } = await params

  if (brand !== 'clearview' || !isEventsCategory(category)) {
    notFound()
  }

  return <SharedListingsRoute tab={eventsCategoryTab(category)} path={PATHS[category]} searchParams={await searchParams} />
}
