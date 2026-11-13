import type { Metadata } from 'next'
import { draftMode } from 'next/headers'
import { notFound } from 'next/navigation'
import { stegaClean } from 'next-sanity'
import { Suspense } from 'react'

import { AWARD_CATEGORY_PAGE_ID, brandOrigin } from '@/brands'
import { AwardCategoryPage } from '@/components/sections/awards/AwardCategoryPage'
import { awardCategoryHref } from '@/lib/links'
import { isAwardedCategory, toAwardCategoryView } from '@/sanity/award-category-view'
import { fetchAdUnits } from '@/sanity/brand-title'
import { cachedSanity, cachedUkToday, getDynamicFetchOptions, type DynamicFetchOptions } from '@/sanity/live'
import { AWARD_CATEGORY_PAGE_QUERY, AWARD_CATEGORY_QUERY, OTHER_AWARDS_QUERY } from '@/sanity/queries'
import { PLACEHOLDER_SLUG } from '@/sanity/static-params'

// An award category page: one category as awarded by one evergreen programme, /awards/{programme}/{category}
// (awardCategoryHref). Served on ClearView only, like the other shared records; every other host answers 404.
// A pair the programme never awarded is a 404 too (isAwardedCategory). The 404 is intended, so the route opts out of
// instant-navigation validation, as the post page does.
export const instant = false

type Params = { brand: string; programme: string; category: string }

// Nothing is prerendered at build: about 1,500 programme and category pairs exist, so each page renders on its
// first visit and its queries stay cached by cachedSanity. Cache Components rejects an empty list, hence one
// throwaway pair that the page 404s.
export function generateStaticParams() {
  return [{ programme: PLACEHOLDER_SLUG, category: PLACEHOLDER_SLUG }]
}

const PUBLISHED: DynamicFetchOptions = { perspective: 'published', stega: false }

function fetchCategory(programme: string, category: string, options: DynamicFetchOptions) {
  return cachedSanity({ query: AWARD_CATEGORY_QUERY, params: { programme, category }, ...options })
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { brand, programme, category } = await params

  if (brand !== 'clearview') {
    return {}
  }

  const { data } = await fetchCategory(programme, category, PUBLISHED)

  if (!isAwardedCategory(data)) {
    return {}
  }

  const description = stegaClean(data.description)?.trim()

  return {
    title: `${stegaClean(data.title)} | ${stegaClean(data.programme.title)}`,
    ...(description ? { description } : {}),
    alternates: { canonical: `${brandOrigin('clearview')}${awardCategoryHref(data.programme.slug, data.slug, 'clearview')}` },
  }
}

export default async function AwardCategoryRoute({ params }: { params: Promise<Params> }) {
  const { brand, programme, category } = await params

  if (brand !== 'clearview' || programme === PLACEHOLDER_SLUG) {
    notFound()
  }

  const { isEnabled: isDraftMode } = await draftMode()

  if (isDraftMode) {
    return (
      <Suspense fallback={null}>
        <DynamicAwardCategory programme={programme} category={category} />
      </Suspense>
    )
  }

  return <CachedAwardCategory programme={programme} category={category} perspective="published" stega={false} />
}

async function DynamicAwardCategory({ programme, category }: { programme: string; category: string }) {
  const { perspective, variant, stega } = await getDynamicFetchOptions()

  return (
    <CachedAwardCategory
      programme={programme}
      category={category}
      perspective={perspective}
      variant={variant}
      stega={stega}
    />
  )
}

async function CachedAwardCategory({
  programme,
  category,
  perspective,
  variant,
  stega,
}: { programme: string; category: string } & DynamicFetchOptions) {
  const options = { perspective, variant, stega }
  const today = await cachedUkToday()
  const [{ data }, { data: others }, { data: copy }, ads] = await Promise.all([
    fetchCategory(programme, category, options),
    cachedSanity({ query: OTHER_AWARDS_QUERY, params: { programme, today }, ...options }),
    cachedSanity({ query: AWARD_CATEGORY_PAGE_QUERY, params: { id: AWARD_CATEGORY_PAGE_ID }, ...options }),
    fetchAdUnits('clearview', 'other', options),
  ])

  // The labels document is required, like the Categories page's: no copy defaults in code.
  if (!isAwardedCategory(data) || !copy) {
    notFound()
  }

  return <AwardCategoryPage view={toAwardCategoryView({ category: data, others, copy, ads, today })} />
}
