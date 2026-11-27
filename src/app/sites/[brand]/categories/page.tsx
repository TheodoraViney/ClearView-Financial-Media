import type { Metadata } from 'next'
import { draftMode } from 'next/headers'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'

import { categoriesPageDocumentId, isEditorialBrandKey, type EditorialBrandKey } from '@/brands'
import { PageBlocks } from '@/components/blocks/PageBlocks'
import { JsonLd } from '@/components/ui/JsonLd'
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
import { jsonLdGraph } from '@/lib/json-ld'
import { fetchAdUnits } from '@/sanity/brand-title'
import {
  articleListingHrefs,
  categoriesHeading,
  findPageHero,
  resolveCategoriesFilters,
  toCategoriesHeading,
} from '@/sanity/categories-view'
import { absoluteUrl, breadcrumbList, itemList } from '@/sanity/json-ld'
import { heroIntroText } from '@/sanity/page-hero'
import {
  cachedNow,
  cachedSanity,
  cachedUkToday,
  getDynamicFetchOptions,
  type DynamicFetchOptions,
} from '@/sanity/live'
import { CATEGORIES_LATEST_QUERY, CATEGORIES_OLDEST_QUERY, CATEGORIES_PAGE_QUERY } from '@/sanity/queries'
import { pageMetadata } from '@/sanity/seo'

// The Categories page (the articles list) of an editorial brand, filtered and paged by the URL
// (src/lib/categories.ts). It takes precedence over [slug] for the page document with the slug "categories".
// The page document `page-categories-{brand}` is built from blocks (src/sanity/categories-view.ts): a Two columns block
// in the article page's layout (`sidebar="rail"`: Top banner, page heading, articles list, related topics; Side banner,
// Most read, which loads its own list). The route resolves the URL state and the list and hands them to the blocks as
// `articles`.
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

// `$today` is for the blocks' fills (BLOCKS_PROJECTION); the Categories blocks themselves do not use it.
function fetchPageData(brand: EditorialBrandKey, today: string, options: DynamicFetchOptions) {
  return cachedSanity({
    query: CATEGORIES_PAGE_QUERY,
    params: { brand, id: categoriesPageDocumentId(brand), today },
    ...options,
  })
}

// Filtered or re-sorted lists are noindex and point at the base list; plain pages 2 and up are their own canonical.
// The title is the heading category's or topic's, else the document title; the description the heading's intro (the
// term's description, else the page heading block's intro).
export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { brand } = await params

  if (!isEditorialBrandKey(brand)) {
    return {}
  }

  const state = parseCategoriesState(await searchParams)
  const { data } = await fetchPageData(brand, await cachedUkToday(), PUBLISHED)

  if (!data.page) {
    return {}
  }

  const filtered = hasFilters(state)
  const hero = findPageHero(data.page.blocks)
  const heading = categoriesHeading(
    { title: data.page.title, intro: hero?.intro ?? null },
    resolveCategoriesFilters(state, data),
  )
  const path = filtered ? CATEGORIES_PATH : categoriesHref(state)

  // A category or topic heading names the view, so the page's own meta title and description give way to the term's.
  // The page document serves every view, so its canonical override is not used.
  const seo = data.page.seo && {
    ...data.page.seo,
    canonical: null,
    ...(heading.term ? { title: null, description: null } : {}),
  }

  return pageMetadata({
    brand,
    path,
    seo,
    title: heading.title,
    description: heroIntroText(heading.intro),
    noIndex: filtered,
  })
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
  const [today, now] = await Promise.all([cachedUkToday(), cachedNow()])
  const [{ data }, ads] = await Promise.all([fetchPageData(brand, today, options), fetchAdUnits(brand, 'other', options)])

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

  // The articles this page lists, and the heading block's trail (Home / page, or Home / page / category or topic).
  const context = { brand, data, filters, list, banner3: ads.banner3 }
  const hero = findPageHero(data.page.blocks)
  const jsonLd = jsonLdGraph([
    itemList(brand, articleListingHrefs(context)),
    hero && breadcrumbList(brand, toCategoriesHeading(hero, context).breadcrumb, absoluteUrl(brand, categoriesHref(filters.state))),
  ])

  return (
    <main>
      <JsonLd data={jsonLd} />
      <PageBlocks
        blocks={data.page.blocks}
        brand={brand}
        today={today}
        now={now}
        ads={ads}
        options={options}
        sidebar="rail"
        articles={context}
      />
    </main>
  )
}
