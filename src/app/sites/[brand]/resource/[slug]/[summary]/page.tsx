import type { Metadata } from 'next'
import { draftMode } from 'next/headers'
import { notFound } from 'next/navigation'
import { stegaClean } from 'next-sanity'
import { Suspense } from 'react'

import { RESEARCH_REPORT_PAGE_ID } from '@/brands'
import { ExecutiveSummaryPage } from '@/components/sections/research/ExecutiveSummaryPage'
import { cachedSanity, getDynamicFetchOptions, type DynamicFetchOptions } from '@/sanity/live'
import { RESEARCH_REPORT_PAGE_QUERY, RESEARCH_REPORT_QUERY } from '@/sanity/queries'
import {
  executiveSummaryDescription,
  executiveSummaryPagePath,
  toExecutiveSummaryView,
  type ResearchReportData,
} from '@/sanity/research-report-view'
import { pageMetadata } from '@/sanity/seo'
import { PLACEHOLDER_SLUG } from '@/sanity/static-params'

// A research report's Executive Summary page at /resource/{report slug}/{summary slug}, from the report's own
// summary fields. Same host and slug rules as the report page (../page.tsx). It exists only while the report is found,
// the segment equals its summary's slug and the summary has a lead, an introduction or a section, and answers 404
// otherwise. The slug is the report's `summarySlug`, else RESEARCH_SUMMARY_DEFAULT_SLUG (RESEARCH_REPORT_QUERY).
export const instant = false

type Params = { brand: string; slug: string; summary: string }

// The parent segment generates the throwaway report slug; this one adds a throwaway summary slug, both 404.
export function generateStaticParams() {
  return [{ summary: PLACEHOLDER_SLUG }]
}

const PUBLISHED: DynamicFetchOptions = { perspective: 'published', stega: false }

// A segment arrives percent-encoded when it holds characters outside ASCII. Sanity holds the decoded slugs.
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

/** The page's path when the report's summary is served at this segment, else null. */
function pagePath(report: ResearchReportData, summary: string): string | null {
  return stegaClean(report.executiveSummary.slug)?.trim() === summary ? executiveSummaryPagePath(report) : null
}

async function routeParams(params: Promise<Params>) {
  const { brand, slug, summary } = await params

  return { brand, slug: decodeSlug(slug), summary: decodeSlug(summary) }
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { brand, slug, summary } = await routeParams(params)

  if (brand !== 'clearview') {
    return {}
  }

  const [{ data }, { data: copy }] = await Promise.all([
    fetchReport(slug, PUBLISHED),
    cachedSanity({ query: RESEARCH_REPORT_PAGE_QUERY, params: { id: RESEARCH_REPORT_PAGE_ID }, ...PUBLISHED }),
  ])
  const path = data ? pagePath(data, summary) : null

  if (!data || !path) {
    return {}
  }

  // The "Summary SEO" tab's fields, else the summary's own; the share image falls back to the report page's ("SEO"
  // tab) before the report cover.
  return pageMetadata({
    brand,
    path,
    seo: data.summarySeo,
    title: [copy?.summaryTitle, data.title].map((part) => stegaClean(part)?.trim()).filter(Boolean).join(' — '),
    description: executiveSummaryDescription(data),
    images: [data.seo?.image, data.downloadThumbnail],
  })
}

export default async function ExecutiveSummaryRoute({ params }: { params: Promise<Params> }) {
  const { brand, slug, summary } = await routeParams(params)

  if (brand !== 'clearview' || slug === PLACEHOLDER_SLUG || summary === PLACEHOLDER_SLUG) {
    notFound()
  }

  const { isEnabled: isDraftMode } = await draftMode()

  if (isDraftMode) {
    return (
      <Suspense fallback={null}>
        <DynamicSummary slug={slug} summary={summary} />
      </Suspense>
    )
  }

  return <CachedSummary slug={slug} summary={summary} perspective="published" stega={false} />
}

async function DynamicSummary({ slug, summary }: { slug: string; summary: string }) {
  const { perspective, variant, stega } = await getDynamicFetchOptions()

  return <CachedSummary slug={slug} summary={summary} perspective={perspective} variant={variant} stega={stega} />
}

async function CachedSummary({
  slug,
  summary,
  perspective,
  variant,
  stega,
}: { slug: string; summary: string } & DynamicFetchOptions) {
  const options = { perspective, variant, stega }
  const [{ data: report }, { data: copy }] = await Promise.all([
    fetchReport(slug, options),
    cachedSanity({ query: RESEARCH_REPORT_PAGE_QUERY, params: { id: RESEARCH_REPORT_PAGE_ID }, ...options }),
  ])

  if (!report || !copy || !pagePath(report, summary)) {
    notFound()
  }

  return <ExecutiveSummaryPage view={toExecutiveSummaryView({ report, copy })} />
}
