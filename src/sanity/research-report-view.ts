import { stegaClean, type StegaBranded } from 'next-sanity'

import { isBrandKey } from '@/brands'
import type { ArticleCardView } from '@/lib/article'
import { formatLongDate } from '@/lib/dates'
import type { AdUnits } from '@/lib/gam'
import { RESEARCH_LISTING_PATH, researchDownloadHref, resolveHref, safeHref, sharedRecordHref } from '@/lib/links'
import type { ResearchChart } from '@/components/ui/ResearchChartCard'
import {
  RESEARCH_CHART_GAUGES_MAX,
  RESEARCH_CHARTS_MAX,
  blocksOrNull,
  executiveSummaryPath,
  hasExecutiveSummary,
  relatedResearchItems,
  type ExecutiveSummaryView,
  type ResearchReportSectionId,
  type ResearchReportView,
} from '@/lib/research-report'
import { RESEARCH_REPORT_PAGE_COPY_KEYS, type ResearchReportPageCopy, type ResearchReportPageCopyKey } from '@/lib/research-report-copy'

import { clipDescription } from './awards-programme-view'
import { toHeading } from './heading'
import { toImage } from './image'
import type { MostReadGroupFill } from './most-read'
import type { RESEARCH_REPORT_PAGE_QUERY_RESULT, RESEARCH_REPORT_QUERY_RESULT } from './types'

export type ResearchReportData = NonNullable<StegaBranded<RESEARCH_REPORT_QUERY_RESULT>>
type CopyData = NonNullable<StegaBranded<RESEARCH_REPORT_PAGE_QUERY_RESULT>>
type RelatedReport = ResearchReportData['relatedResearchFill'][number]

const filled = <T extends string>(value: T | null | undefined): value is T => Boolean(stegaClean(value)?.trim())

/** The labels as the CMS holds them, stega kept for click-to-edit. Every label is required in the Studio. */
function toCopy(copy: CopyData): ResearchReportPageCopy {
  return Object.fromEntries(RESEARCH_REPORT_PAGE_COPY_KEYS.map((key) => [key, copy[key] ?? ''])) as ResearchReportPageCopy
}

/** The report's own path, /resource/{slug}. */
export const reportPath = (report: Pick<ResearchReportData, 'slug'>): string | null =>
  sharedRecordHref('resource', report.slug, 'clearview')

/**
 * The report's Executive Summary page path, /resource/{slug}/{summary slug}: null unless the report has a slug and its
 * `executiveSummaryPage` document has a slug and content (stega-clean checks, so it holds in draft mode too).
 */
export function executiveSummaryPagePath(report: ResearchReportData): string | null {
  const path = reportPath(report)
  const summary = report.executiveSummaryPage
  const slug = stegaClean(summary?.slug)?.trim()

  return path && slug && hasExecutiveSummary(summary, stegaClean) ? executiveSummaryPath(path, slug) : null
}

/** Plain text with its whitespace collapsed, stega removed. */
const plain = (value: string | null | undefined): string => stegaClean(value ?? '').replace(/\s+/g, ' ').trim()

/**
 * The metadata description: the standfirst, else the short executive summary, else the start of the legacy body (the
 * only text every migrated report has) cut at a word boundary. Null when the report has none of them.
 */
export function researchReportDescription(report: ResearchReportData): string | null {
  const own = [report.standfirst, report.summaryText].map(plain).find(Boolean)

  return own ?? clipDescription(plain(report.bodyText))
}

/**
 * The Executive Summary page's metadata description: its lead, else the start of its introduction cut at a word
 * boundary, else the report's own description (researchReportDescription).
 */
export function executiveSummaryDescription(report: ResearchReportData): string | null {
  const summary = report.executiveSummaryPage

  return plain(summary?.leadText) || clipDescription(plain(summary?.introText)) || researchReportDescription(report)
}

/** An image whose missing alt falls back to a stega-clean name, since the alt goes into an attribute. */
function withAlt<I extends { alt: string }>(image: I | null, fallback: string | null | undefined): I | null {
  return image && !image.alt ? { ...image, alt: stegaClean(fallback)?.trim() ?? '' } : image
}

/** The share image: the banner, else the report cover. */
export const researchReportShareImage = (report: ResearchReportData) =>
  toImage(report.featuredImage) ?? toImage(report.downloadThumbnail)

const keyFindings = (report: ResearchReportData) =>
  (report.keyFindings ?? []).flatMap((item) =>
    filled(item.value) && filled(item.text)
      ? [{ key: item._key, value: item.value, text: item.text, note: filled(item.note) ? item.note : null }]
      : [],
  )

/**
 * The chart cards: a chart needs a title and at least one gauge with a label, a figure and an arc fill (the Studio
 * requires them, a draft may lack them); at most RESEARCH_CHARTS_MAX cards of up to RESEARCH_CHART_GAUGES_MAX gauges.
 * The fill is clamped to 0–100. The gauge's accessible name is built from stega-clean text, as it is an attribute.
 */
function charts(report: ResearchReportData): ResearchChart[] {
  return (report.charts ?? []).slice(0, RESEARCH_CHARTS_MAX).flatMap((chart) => {
    const gauges = (chart.gauges ?? []).slice(0, RESEARCH_CHART_GAUGES_MAX).flatMap((gauge) => {
      if (!filled(gauge.label) || !filled(gauge.value) || typeof gauge.percent !== 'number' || !Number.isFinite(gauge.percent)) {
        return []
      }

      const percent = Math.min(100, Math.max(0, gauge.percent))

      return [
        {
          key: gauge._key,
          label: gauge.label,
          value: gauge.value,
          percent,
          current: gauge.current === true,
          ariaLabel: `${plain(gauge.label)}: ${plain(gauge.value)} (${Math.round(percent)}% of scale)`,
        },
      ]
    })

    return filled(chart.title) && gauges.length > 0
      ? [{ key: chart._key, title: chart.title, note: filled(chart.note) ? chart.note : null, gauges }]
      : []
  })
}

function toReportCard(report: RelatedReport) {
  const publishedAt = stegaClean(report.publishedAt) ?? null

  return {
    key: report._id,
    title: report.title ?? '',
    href: reportPath(report),
    publishedAt,
    date: formatLongDate(publishedAt),
    cover: withAlt(toImage(report.downloadThumbnail), report.title),
  }
}

/** A post in the group Most read list, linked to its final URL on its own publication (ClearView runs no posts). */
function toMostReadCard(post: StegaBranded<MostReadGroupFill>[number]): ArticleCardView | null {
  const brands = (post.brands ?? []).map((key) => stegaClean(key)).filter(isBrandKey)
  const href = resolveHref({ kind: 'internal', internal: { _type: 'post', slug: post.slug, brands } }, 'clearview')

  if (!href || !filled(post.title)) {
    return null
  }

  return {
    key: post._id,
    href,
    title: post.title,
    label: post.topic?.title ?? null,
    publishedAt: stegaClean(post.publishedAt) ?? null,
    image: toImage(post.image),
  }
}

/** The research report page as plain props, from the report, the labels document, the ads and the Most read list. */
export function toResearchReportView({
  report,
  copy: rawCopy,
  ads,
  mostRead,
}: {
  report: ResearchReportData
  copy: CopyData
  ads: AdUnits
  mostRead: StegaBranded<MostReadGroupFill>
}): ResearchReportView {
  const copy = toCopy(rawCopy)
  const summaryPath = executiveSummaryPagePath(report)
  const summaryText = blocksOrNull(report.summary)
  const href = researchDownloadHref(report)
  const publishedAt = stegaClean(report.publishedAt) ?? null
  const findings = keyFindings(report)
  const rows = (report.methodology ?? []).flatMap((row) =>
    filled(row.label) && filled(row.value) ? [{ key: row._key, label: row.label, value: row.value }] : [],
  )
  const contributors = (report.authors ?? []).flatMap((person) =>
    person && filled(person.title) ? [{ key: person._id, name: person.title }] : [],
  )
  const methodologyIntro = blocksOrNull(report.methodologyIntro)
  const insights = (report.insights ?? []).filter(filled)
  const chartCards = charts(report)
  const company = report.researchPartner?.company
  const website = safeHref(company?.websiteUrl)
  const related = relatedResearchItems(report.relatedResearch, report.relatedResearchFill, {
    excludeId: report._id,
    clean: stegaClean,
  }).map(({ report: item }) => toReportCard(item))
  const mostReadItems = mostRead.map(toMostReadCard).filter((item): item is ArticleCardView => item !== null)

  const view: Omit<ResearchReportView, 'nav'> = {
    title: report.title ?? '',
    breadcrumb: [
      { label: copy.breadcrumbHomeLabel, href: '/' },
      { label: copy.breadcrumbResearchLabel, href: RESEARCH_LISTING_PATH },
    ],
    typeLabel: copy.typeLabel,
    edition: filled(report.edition) ? report.edition : null,
    publishedAt,
    date: formatLongDate(publishedAt),
    standfirst: filled(report.standfirst) ? report.standfirst : null,
    download: href ? { label: copy.downloadLabel, href } : null,
    cover: withAlt(toImage(report.downloadThumbnail), report.title),
    // Shown when there is a short summary or a full Executive Summary page, so the page is always linked.
    summary:
      summaryText || summaryPath
        ? {
            heading: toHeading(rawCopy.executiveSummaryHeading),
            text: summaryText,
            fullSummary: summaryPath ? { label: copy.readFullSummaryLabel, href: summaryPath } : null,
          }
        : null,
    keyFindings: findings.length > 0 ? { heading: toHeading(rawCopy.keyFindingsHeading), items: findings } : null,
    methodology:
      methodologyIntro || rows.length > 0 || contributors.length > 0
        ? { heading: toHeading(rawCopy.methodologyHeading), intro: methodologyIntro, rows, contributors }
        : null,
    insights:
      chartCards.length > 0 || insights.length > 0
        ? {
            heading: toHeading(rawCopy.insightsHeading),
            charts: chartCards,
            subheading: toHeading(rawCopy.selectedInsightsHeading),
            items: insights,
          }
        : null,
    researchPartner:
      company && filled(company.title)
        ? {
            heading: toHeading(rawCopy.researchPartnerHeading),
            name: company.title,
            logo: withAlt(toImage(company.logo), company.title),
            description: filled(report.researchPartner?.description) ? report.researchPartner.description : null,
            // The website only: a site-relative or mailto value is not a company's site.
            profile: website && /^https?:\/\//i.test(website) ? { label: copy.companyProfileLabel, href: website } : null,
          }
        : null,
    relatedResearch: related.length > 0 ? { heading: toHeading(rawCopy.relatedResearchHeading), items: related } : null,
    mostRead: mostReadItems.length > 0 ? { heading: toHeading(rawCopy.mostReadHeading), items: mostReadItems } : null,
    ads: { top: ads.top, side: ads.side },
  }

  // One link per section that has content, in page order.
  const sections: [ResearchReportSectionId, unknown, ResearchReportPageCopyKey][] = [
    ['executive-summary', view.summary, 'navExecutiveSummaryLabel'],
    ['key-findings', view.keyFindings, 'navKeyFindingsLabel'],
    ['contributors-methodology', view.methodology, 'navMethodologyLabel'],
    ['charts-insights', view.insights, 'navInsightsLabel'],
    ['research-partner', view.researchPartner, 'navResearchPartnerLabel'],
    ['related-research', view.relatedResearch, 'navRelatedResearchLabel'],
  ]

  return { ...view, nav: sections.flatMap(([id, section, label]) => (section ? [{ id, label: copy[label] }] : [])) }
}

/** The Executive Summary page as plain props. Call it only when executiveSummaryPagePath(report) is set. */
export function toExecutiveSummaryView({ report, copy: rawCopy }: { report: ResearchReportData; copy: CopyData }): ExecutiveSummaryView {
  const copy = toCopy(rawCopy)
  const summary = report.executiveSummaryPage
  const findings = keyFindings(report)
  const date = formatLongDate(stegaClean(report.publishedAt))
  const partner = report.researchPartner?.company?.title

  return {
    title: copy.summaryTitle,
    breadcrumb: [
      { label: copy.breadcrumbHomeLabel, href: '/' },
      { label: copy.breadcrumbResearchLabel, href: RESEARCH_LISTING_PATH },
      { label: copy.summaryBreadcrumbLabel },
    ],
    typeLabel: copy.typeLabel,
    details: [
      { key: 'report', label: copy.summaryReportLabel, value: report.title },
      { key: 'edition', label: copy.summaryEditionLabel, value: report.edition },
      { key: 'date', label: copy.summaryDateLabel, value: date },
      { key: 'partner', label: copy.summaryPartnerLabel, value: partner },
    ].flatMap((item) => (filled(item.value) ? [{ ...item, value: item.value }] : [])),
    lead: blocksOrNull(summary?.lead),
    intro: blocksOrNull(summary?.intro),
    sections: (summary?.sections ?? []).flatMap((section) => {
      const heading = filled(section.heading) ? section.heading : null
      const body = blocksOrNull(section.body)

      return heading || body ? [{ key: section._key, heading, body }] : []
    }),
    keyTakeaways: findings.length > 0 ? { heading: toHeading(rawCopy.keyTakeawaysHeading), items: findings } : null,
    back: { label: copy.backToReportLabel, href: reportPath(report) ?? '/' },
  }
}
