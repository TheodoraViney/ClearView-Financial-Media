import type { Metadata } from 'next'
import { draftMode } from 'next/headers'
import { notFound } from 'next/navigation'
import { stegaClean } from 'next-sanity'
import { Suspense } from 'react'

import { BRANDS, isBrandKey, searchPageDocumentId, type BrandKey } from '@/brands'
import { SearchPage } from '@/components/sections/search/SearchPage'
import { SEARCH_MAX_PAGE, parseSearchState, type RawSearchParams, type SearchState } from '@/lib/search-page'
import { toSearchPageCopy } from '@/lib/search-page-copy'
import { searchResults } from '@/lib/search-results'
import { cachedSanity, getDynamicFetchOptions, type DynamicFetchOptions } from '@/sanity/live'
import { SEARCH_PAGE_QUERY } from '@/sanity/queries'

// The search results page of every brand, ClearView included, searching the Algolia index by the URL
// (src/lib/search-page.ts). Closed to crawlers: noindex here and Disallow in the production robots.txt.
//
// A blocking route, like the Categories page: the results depend on searchParams, so nothing of it prerenders, and
// reading them before the response streams lets a page past the end return a real 404. The copy is cached by
// cachedSanity; the Algolia results are not cached, every term being its own entry.
export const instant = false

type Props = {
  params: Promise<{ brand: string }>
  searchParams: Promise<RawSearchParams>
}

const PUBLISHED: DynamicFetchOptions = { perspective: 'published', stega: false }

function fetchCopy(brand: BrandKey, options: DynamicFetchOptions) {
  return cachedSanity({ query: SEARCH_PAGE_QUERY, params: { id: searchPageDocumentId(brand) }, ...options })
}

// No canonical: the page is never indexed.
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { brand } = await params

  if (!isBrandKey(brand)) {
    return {}
  }

  const { data } = await fetchCopy(brand, PUBLISHED)
  const copy = toSearchPageCopy(data)

  return {
    ...(copy ? { title: stegaClean(copy.title) } : {}),
    robots: { index: false, follow: true },
  }
}

export default async function SearchRoute({ params, searchParams }: Props) {
  const { brand } = await params

  if (!isBrandKey(brand)) {
    notFound()
  }

  const state = parseSearchState(await searchParams)

  // Algolia serves no hits past SEARCH_MAX_PAGE, so it is not asked; without a term there is one page only.
  if (state.page > SEARCH_MAX_PAGE || (!state.q && state.page > 1)) {
    notFound()
  }

  const { isEnabled: isDraftMode } = await draftMode()

  if (isDraftMode) {
    return (
      <Suspense fallback={null}>
        <DynamicSearch brand={brand} state={state} />
      </Suspense>
    )
  }

  return <Search brand={brand} state={state} perspective="published" stega={false} />
}

async function DynamicSearch({ brand, state }: { brand: BrandKey; state: SearchState }) {
  const { perspective, variant, stega } = await getDynamicFetchOptions()

  return <Search brand={brand} state={state} perspective={perspective} variant={variant} stega={stega} />
}

async function Search({
  brand,
  state,
  perspective,
  variant,
  stega,
}: { brand: BrandKey; state: SearchState } & DynamicFetchOptions) {
  const [{ data }, view] = await Promise.all([
    fetchCopy(brand, { perspective, variant, stega }),
    searchResults(state, brand),
  ])
  const copy = toSearchPageCopy(data)

  if (!copy) {
    notFound()
  }

  // A page past the last one with results; page 1 of a search without results shows the no-results panel.
  if (view && view.page > Math.max(view.pages, 1)) {
    notFound()
  }

  return <SearchPage copy={copy} state={state} view={view} label={`Search ${BRANDS[brand].title}`} />
}
