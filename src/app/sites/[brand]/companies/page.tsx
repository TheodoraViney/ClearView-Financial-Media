import type { Metadata } from 'next'
import { draftMode } from 'next/headers'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'

import { PageBlocks } from '@/components/blocks/PageBlocks'
import { TopBanner } from '@/components/sections/company-engagement/TopBanner'
import { JsonLd } from '@/components/ui/JsonLd'
import {
  COMPANY_ENGAGEMENT_PAGE_DOCUMENT_ID,
  companyEngagementCanonical,
  type RawSearchParams,
} from '@/lib/company-engagement'
import { jsonLdGraph } from '@/lib/json-ld'
import { COMPANY_ENGAGEMENT_PATH } from '@/lib/links'
import { fetchAdUnits } from '@/sanity/brand-title'
import { companyDirectoryHrefs, toCompanyEngagementContext } from '@/sanity/company-engagement-view'
import { absoluteUrl, blocksBreadcrumb, breadcrumbList, itemList } from '@/sanity/json-ld'
import { cachedNow, cachedSanity, cachedUkToday, getDynamicFetchOptions, type DynamicFetchOptions } from '@/sanity/live'
import { COMPANY_ENGAGEMENT_PAGE_QUERY, COMPANY_ENGAGEMENT_QUERY } from '@/sanity/queries'
import { pageMetadata } from '@/sanity/seo'

// The Company Engagement page, Industry Engagement, at /companies on ClearView Publishing: the `page` document
// COMPANY_ENGAGEMENT_PAGE_DOCUMENT_ID, built from blocks like any page (page heading, search and filters, company
// directory, winners and awards sponsors, forum and summit partners, sponsored content). The route fetches the
// companies and the records that name them once and hands them, with the URL, to the blocks (`companies`). Every other
// host answers 404, as does the page until its document is published.
//
// A blocking route, like the shared listings: the lists depend on searchParams, so nothing of it prerenders. Both
// queries stay cached by cachedSanity (the records for every visitor, the filters applied to the cached result). The
// 404 is intended, so the route opts out of instant-navigation validation.
export const instant = false

type Props = {
  params: Promise<{ brand: string }>
  searchParams: Promise<RawSearchParams>
}

const PUBLISHED: DynamicFetchOptions = { perspective: 'published', stega: false }

function fetchPage(today: string, options: DynamicFetchOptions) {
  return Promise.all([
    cachedSanity({
      query: COMPANY_ENGAGEMENT_PAGE_QUERY,
      params: { id: COMPANY_ENGAGEMENT_PAGE_DOCUMENT_ID, brand: 'clearview', today },
      ...options,
    }),
    cachedSanity({ query: COMPANY_ENGAGEMENT_QUERY, params: { brand: 'clearview' }, ...options }),
  ])
}

// The unfiltered pages are indexable and their own canonical; a searched or filtered view is noindex.
export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { brand } = await params

  if (brand !== 'clearview') {
    return {}
  }

  const [{ data: page }, { data }] = await fetchPage(await cachedUkToday(), PUBLISHED)

  if (!page) {
    return {}
  }

  const context = toCompanyEngagementContext({ data, blocks: page.blocks, params: await searchParams })
  const canonical = context ? companyEngagementCanonical(context.state) : null

  return pageMetadata({
    brand,
    path: canonical?.path ?? null,
    seo: page.seo,
    title: page.title,
    noIndex: !canonical?.indexable,
  })
}

export default async function CompanyEngagementRoute({ params, searchParams }: Props) {
  const { brand } = await params

  if (brand !== 'clearview') {
    notFound()
  }

  const query = await searchParams
  const { isEnabled: isDraftMode } = await draftMode()

  if (isDraftMode) {
    return (
      <Suspense fallback={null}>
        <DynamicCompanyEngagement params={query} />
      </Suspense>
    )
  }

  return <CachedCompanyEngagement params={query} perspective="published" stega={false} />
}

async function DynamicCompanyEngagement({ params }: { params: RawSearchParams }) {
  const { perspective, variant, stega } = await getDynamicFetchOptions()

  return <CachedCompanyEngagement params={params} perspective={perspective} variant={variant} stega={stega} />
}

async function CachedCompanyEngagement({
  params,
  perspective,
  variant,
  stega,
}: { params: RawSearchParams } & DynamicFetchOptions) {
  const options = { perspective, variant, stega }
  const [today, now, ads] = await Promise.all([cachedUkToday(), cachedNow(), fetchAdUnits('clearview', 'other', options)])
  const [{ data: page }, { data }] = await fetchPage(today, options)

  // The page document is required: no copy defaults in code.
  if (!page) {
    notFound()
  }

  const context = toCompanyEngagementContext({ data, blocks: page.blocks, params })

  // A page past the end of any list is a 404.
  if (!context) {
    notFound()
  }

  // The companies the directory lists on this page (when the page has the directory), and the heading block's trail.
  const directory = page.blocks?.some((block) => block._type === 'companyDirectory')
  const trail = blocksBreadcrumb(page.blocks)
  const jsonLd = jsonLdGraph([
    directory ? itemList('clearview', companyDirectoryHrefs(context)) : null,
    trail && breadcrumbList('clearview', trail, absoluteUrl('clearview', COMPANY_ENGAGEMENT_PATH)),
  ])

  return (
    <main className="mx-auto flex w-full max-w-page flex-col pb-16 md:pb-20">
      <JsonLd data={jsonLd} />
      <PageBlocks
        blocks={page.blocks}
        brand="clearview"
        today={today}
        now={now}
        ads={ads}
        options={options}
        intro={<TopBanner unit={ads.top} />}
        companies={context}
      />
    </main>
  )
}
