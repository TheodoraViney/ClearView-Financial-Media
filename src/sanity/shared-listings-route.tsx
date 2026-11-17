import type { Metadata } from 'next'
import { draftMode } from 'next/headers'
import { notFound } from 'next/navigation'
import { stegaClean } from 'next-sanity'
import { Suspense } from 'react'

import { AWARDS_PROGRAMME_PAGE_ID, brandOrigin } from '@/brands'
import { PageBlocks } from '@/components/blocks/PageBlocks'
import {
  isListingBaseView,
  SHARED_LISTINGS_PAGE_DOCUMENT_ID,
  SHARED_LISTINGS_TAB_PATHS,
  type RawSearchParams,
  type SharedListingsTab,
} from '@/lib/shared-listings'

import { fetchAdUnits } from './brand-title'
import { cachedNow, cachedSanity, cachedUkToday, getDynamicFetchOptions, type DynamicFetchOptions } from './live'
import { SHARED_LISTINGS_PAGE_QUERY } from './queries'
import { isCompletePage, sharedListingsState } from './shared-listings-view'

/*
 * The shared listings page, rendered by its two routes: /events-category/{awards,summits,briefings,webinar} and
 * /resource-categories/research. It is the `page` document SHARED_LISTINGS_PAGE_DOCUMENT_ID, built from blocks like any
 * page (a Two columns block with the page heading and the record listing in its main column); each route resolves
 * its tab and passes its own path, which the record listing block reads through `listing`. Served on ClearView only:
 * the routes answer 404 on every other host before calling in.
 */

/** Which tab a route opens, and its own path: the filter form's action and the base of its page links. */
export type SharedListingsRouteProps = { tab: SharedListingsTab; path: string; searchParams: RawSearchParams }

const PUBLISHED: DynamicFetchOptions = { perspective: 'published', stega: false }

function fetchPage(tab: SharedListingsTab, today: string, options: DynamicFetchOptions) {
  return cachedSanity({
    query: SHARED_LISTINGS_PAGE_QUERY,
    params: { id: SHARED_LISTINGS_PAGE_DOCUMENT_ID, brand: 'clearview', statusesId: AWARDS_PROGRAMME_PAGE_ID, tab, today },
    ...options,
  })
}

/**
 * The canonical is the tab's own path: /events-category/briefings and /events-category/webinar show the same Events
 * list as /events-category/summits, so they point there. Filtered and paged views are noindex.
 */
export async function sharedListingsMetadata({ tab, searchParams }: SharedListingsRouteProps): Promise<Metadata> {
  const today = await cachedUkToday()
  const { data } = await fetchPage(tab, today, PUBLISHED)

  if (!isCompletePage(data)) {
    return {}
  }

  const state = sharedListingsState({ tab, params: searchParams, today, data })

  return {
    title: stegaClean(data.page.title),
    alternates: { canonical: `${brandOrigin('clearview')}${SHARED_LISTINGS_TAB_PATHS[tab]}` },
    ...(state && isListingBaseView(state) ? {} : { robots: { index: false, follow: true } }),
  }
}

export async function SharedListingsRoute(props: SharedListingsRouteProps) {
  const { isEnabled: isDraftMode } = await draftMode()

  if (isDraftMode) {
    return (
      <Suspense fallback={null}>
        <DynamicSharedListings {...props} />
      </Suspense>
    )
  }

  return <CachedSharedListings {...props} perspective="published" stega={false} />
}

async function DynamicSharedListings(props: SharedListingsRouteProps) {
  const { perspective, variant, stega } = await getDynamicFetchOptions()

  return <CachedSharedListings {...props} perspective={perspective} variant={variant} stega={stega} />
}

async function CachedSharedListings({
  tab,
  path,
  searchParams,
  perspective,
  variant,
  stega,
}: SharedListingsRouteProps & DynamicFetchOptions) {
  const options = { perspective, variant, stega }
  const [today, now, ads] = await Promise.all([cachedUkToday(), cachedNow(), fetchAdUnits('clearview', 'other', options)])
  const { data } = await fetchPage(tab, today, options)

  // The page document and the awards status labels are required: no copy defaults in code.
  if (!isCompletePage(data)) {
    notFound()
  }

  // A page past the end of the open tab's list is a 404.
  if (!sharedListingsState({ tab, params: searchParams, today, data })) {
    notFound()
  }

  return (
    <main>
      <PageBlocks
        blocks={data.page.blocks}
        brand="clearview"
        today={today}
        now={now}
        ads={ads}
        listing={{ tab, path, params: searchParams, today, data }}
        sidebar="listing"
      />
    </main>
  )
}
