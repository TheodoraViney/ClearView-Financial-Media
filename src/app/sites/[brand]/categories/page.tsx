import type { Metadata } from 'next'
import { draftMode } from 'next/headers'
import { notFound } from 'next/navigation'
import { stegaClean } from 'next-sanity'
import { Suspense } from 'react'

import {
  articlePageDocumentId,
  brandOrigin,
  categoriesPageDocumentId,
  isEditorialBrandKey,
  mostReadDocumentId,
  type EditorialBrandKey,
} from '@/brands'
import { CategoriesPage } from '@/components/sections/categories/CategoriesPage'
import {
  CATEGORIES_PATH,
  categoriesHref,
  hasFilters,
  pageCount,
  pageRange,
  parseCategoriesState,
  type CategoriesState,
  type RawSearchParams,
} from '@/lib/categories'
import { fetchAdUnits } from '@/sanity/brand-title'
import { categoriesHeading, resolveCategoriesFilters, toCategoriesView } from '@/sanity/categories-view'
import { cachedSanity, getDynamicFetchOptions, type DynamicFetchOptions } from '@/sanity/live'
import { mostReadAutoFill } from '@/sanity/most-read'
import {
  CATEGORIES_LATEST_QUERY,
  CATEGORIES_OLDEST_QUERY,
  CATEGORIES_PAGE_QUERY,
  MOST_READ_QUERY,
} from '@/sanity/queries'

// The Categories page (the articles list) of an editorial brand, filtered and paged by the URL
// (src/lib/categories.ts). It takes precedence over [slug] for the page document with the slug "categories".
//
// A blocking route, like the archive article: the list depends on searchParams, so nothing of it prerenders, and
// reading them before the response streams lets a page past the end return a real 404 and the robots tag sit in the
// head. The queries stay cached per filter combination by cachedSanity; slugs are resolved to known ids first, so a
// made-up slug adds no cache entry.
export const instant = false

type Props = {
  params: Promise<{ brand: string }>
  searchParams: Promise<RawSearchParams>
}

const PUBLISHED: DynamicFetchOptions = { perspective: 'published', stega: false }

function fetchPageData(brand: EditorialBrandKey, options: DynamicFetchOptions) {
  return cachedSanity({
    query: CATEGORIES_PAGE_QUERY,
    params: { brand, id: categoriesPageDocumentId(brand), articlePageId: articlePageDocumentId(brand) },
    ...options,
  })
}

// Filtered or re-sorted lists are noindex and point at the base list; plain pages 2 and up are their own canonical.
export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { brand } = await params

  if (!isEditorialBrandKey(brand)) {
    return {}
  }

  const state = parseCategoriesState(await searchParams)
  const { data } = await fetchPageData(brand, PUBLISHED)

  if (!data.page) {
    return {}
  }

  const filtered = hasFilters(state)
  const heading = categoriesHeading(data.page, resolveCategoriesFilters(state, data))
  const path = filtered ? CATEGORIES_PATH : categoriesHref(state)

  return {
    title: stegaClean(heading.title),
    description: stegaClean(heading.intro) || undefined,
    alternates: { canonical: `${brandOrigin(brand)}${path}` },
    ...(filtered ? { robots: { index: false, follow: true } } : {}),
  }
}

export default async function CategoriesRoute({ params, searchParams }: Props) {
  const { brand } = await params

  // Posts belong to the editorial brands only; ClearView has no list.
  if (!isEditorialBrandKey(brand)) {
    notFound()
  }

  const state = parseCategoriesState(await searchParams)
  const { isEnabled: isDraftMode } = await draftMode()

  if (isDraftMode) {
    return (
      <Suspense fallback={null}>
        <DynamicCategories brand={brand} state={state} />
      </Suspense>
    )
  }

  return <CachedCategories brand={brand} state={state} perspective="published" stega={false} />
}

async function DynamicCategories({ brand, state }: { brand: EditorialBrandKey; state: CategoriesState }) {
  const { perspective, variant, stega } = await getDynamicFetchOptions()

  return <CachedCategories brand={brand} state={state} perspective={perspective} variant={variant} stega={stega} />
}

async function CachedCategories({
  brand,
  state,
  perspective,
  variant,
  stega,
}: { brand: EditorialBrandKey; state: CategoriesState } & DynamicFetchOptions) {
  const options = { perspective, variant, stega }
  const [{ data }, { data: mostRead }, mostReadFill, ads] = await Promise.all([
    fetchPageData(brand, options),
    cachedSanity({ query: MOST_READ_QUERY, params: { brand, id: mostReadDocumentId(brand) }, ...options }),
    // No post is being read: an empty slug excludes none.
    mostReadAutoFill({ brand, slug: '', ...options }),
    fetchAdUnits(brand, 'other', options),
  ])

  if (!data.page) {
    notFound()
  }

  const filters = resolveCategoriesFilters(state, data)
  const { start, end } = pageRange(filters.state.page)
  const { data: list } = await cachedSanity({
    query: filters.state.sort === 'oldest' ? CATEGORIES_OLDEST_QUERY : CATEGORIES_LATEST_QUERY,
    params: {
      brand,
      topicIds: filters.topicIds,
      regionIds: filters.regionIds,
      categoryId: filters.categoryId,
      start,
      end,
    },
    ...options,
  })

  if (filters.state.page > pageCount(list.total)) {
    notFound()
  }

  const view = toCategoriesView({
    data: { ...data, page: data.page },
    filters,
    list,
    mostRead,
    mostReadFill,
    ads,
    brand,
  })

  return <CategoriesPage view={view} />
}
