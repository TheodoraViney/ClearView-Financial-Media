import type { Metadata } from 'next'
import { draftMode } from 'next/headers'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'

import { RESEARCH_REPORT_PAGE_ID } from '@/brands'
import { ResearchReportPage } from '@/components/sections/research/ResearchReportPage'
import { JsonLd } from '@/components/ui/JsonLd'
import { jsonLdGraph } from '@/lib/json-ld'
import { fetchAdUnits } from '@/sanity/brand-title'
import { breadcrumbList } from '@/sanity/json-ld'
import { cachedSanity, getDynamicFetchOptions, type DynamicFetchOptions } from '@/sanity/live'
import { mostReadGroupFill } from '@/sanity/most-read'
import { RESEARCH_REPORT_PAGE_QUERY, RESEARCH_REPORT_QUERY } from '@/sanity/queries'
import {
  reportPath,
  researchReportDescription,
  toResearchReportView,
} from '@/sanity/research-report-view'
import { canonicalUrl, pageMetadata } from '@/sanity/seo'
import { PLACEHOLDER_SLUG } from '@/sanity/static-params'

// A research report at /resource/{slug} (sharedRecordHref), the WordPress path without its trailing slash. Served on
// ClearView only, like the other shared records; every other host answers 404, as does an unknown slug. The 404 is
// intended, so the route opts out of instant-navigation validation, as the event page does. Bare /resource is the
// Research listing (../page.tsx).
export const instant = false

type Params = { brand: string; slug: string }

// Nothing is prerendered at build: each report renders on its first visit and its queries stay cached by
// cachedSanity. Cache Components rejects an empty list, hence one throwaway slug that the page 404s.
export function generateStaticParams() {
  return [{ slug: PLACEHOLDER_SLUG }]
}

const PUBLISHED: DynamicFetchOptions = { perspective: 'published', stega: false }

// The segment arrives percent-encoded when the slug holds characters outside ASCII. Sanity holds the decoded slug.
function decodeSlug(slug: string): string {
  try {
    return decodeURIComponent(slug)
  } catch {
    return slug
  }
}

function fetchReport(slug: string, options: DynamicFetchOptions) {
  return cachedSanity({ query: RESEARCH_REPORT_QUERY, params: { slug }, ...options })
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { brand } = await params
  const slug = decodeSlug((await params).slug)

  if (brand !== 'clearview') {
    return {}
  }

  const { data } = await fetchReport(slug, PUBLISHED)

  if (!data) {
    return {}
  }

  return pageMetadata({
    brand,
    path: reportPath(data),
    seo: data.seo,
    title: data.title,
    description: researchReportDescription(data),
    images: [data.downloadThumbnail],
  })
}

export default async function ResearchReportRoute({ params }: { params: Promise<Params> }) {
  const { brand } = await params
  const slug = decodeSlug((await params).slug)

  if (brand !== 'clearview' || slug === PLACEHOLDER_SLUG) {
    notFound()
  }

  const { isEnabled: isDraftMode } = await draftMode()

  if (isDraftMode) {
    return (
      <Suspense fallback={null}>
        <DynamicReport slug={slug} />
      </Suspense>
    )
  }

  return <CachedReport slug={slug} perspective="published" stega={false} />
}

async function DynamicReport({ slug }: { slug: string }) {
  const { perspective, variant, stega } = await getDynamicFetchOptions()

  return <CachedReport slug={slug} perspective={perspective} variant={variant} stega={stega} />
}

async function CachedReport({ slug, perspective, variant, stega }: { slug: string } & DynamicFetchOptions) {
  const options = { perspective, variant, stega }
  const [{ data: report }, { data: copy }, ads, mostRead] = await Promise.all([
    fetchReport(slug, options),
    cachedSanity({ query: RESEARCH_REPORT_PAGE_QUERY, params: { id: RESEARCH_REPORT_PAGE_ID }, ...options }),
    fetchAdUnits('clearview', 'other', options),
    mostReadGroupFill(options),
  ])

  // The labels document is required, like the event page's: no copy defaults in code.
  if (!report || !copy) {
    notFound()
  }

  const view = toResearchReportView({ report, copy, ads, mostRead })
  const url = canonicalUrl({ brand: 'clearview', path: reportPath(report), seo: report.seo })

  // The visible trail stops at Research; the structured one ends at the report.
  return (
    <>
      {url && <JsonLd data={jsonLdGraph([breadcrumbList('clearview', [...view.breadcrumb, { label: report.title }], url)])} />}
      <ResearchReportPage view={view} />
    </>
  )
}
