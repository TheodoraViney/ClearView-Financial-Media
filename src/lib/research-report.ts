import type { PortableTextProps } from 'next-sanity'

import type { BreadcrumbItem } from '@/components/ui/Breadcrumb'
import type { MediaImage } from '@/components/ui/Media'
import type { ResearchChart } from '@/components/ui/ResearchChartCard'

import type { ArticleCardView } from './article'
import type { HeadingView } from './awards-programme'
import type { AdUnitView } from './gam'

/*
 * The research report page (/resource/{slug}) and its Executive Summary page (/resource/{slug}/{summary slug}) on
 * ClearView Publishing. Pure: type imports only, so the Studio panel and the site share it.
 */

/** Reports in the "Related research" list: the editor's picks, then the automatic fill. */
export const RELATED_RESEARCH_COUNT = 3

/** Key findings cells on the report page (and Key takeaways on the Executive Summary page). */
export const KEY_FINDINGS_MAX = 4

/** The short executive summary on the report page: one paragraph, a soft limit on its plain text. */
export const RESEARCH_SUMMARY_MAX_CHARS = 700

/** Chart cards in the Charts and selected insights section, and gauges on one card (2 → split card, 1 → stacked). */
export const RESEARCH_CHARTS_MAX = 4
export const RESEARCH_CHART_GAUGES_MAX = 2

/** The report fields the related research selection reads (RELATED_RESEARCH in fragments.ts). */
export type RelatedResearchFields = { _id: string; title: string | null }

/** A document id without its `drafts.` or version prefix, so a draft and its published document compare equal. */
export const publishedId = (id: string): string => id.replace(/^(drafts|versions\.[^.]+)\./, '')

/**
 * The "Related research" list, up to RELATED_RESEARCH_COUNT reports, shared by the site and the Studio panel:
 * - the editor's picks first, in their order. A pick of the page's own report (`excludeId`), a repeated report, or one
 *   that is unpublished (null) or untitled is skipped;
 * - then `others` (RELATED_RESEARCH_FILL: research reports, newest first), skipping the page's own report and the
 *   picked ones.
 * `clean` strips stega from a string before it is checked (identity outside draft mode).
 */
export function relatedResearchItems<R extends RelatedResearchFields>(
  picks: (R | null)[] | null | undefined,
  others: R[],
  { excludeId, clean = (value) => value }: { excludeId: string | null; clean?: (value: string) => string },
): { report: R; picked: boolean }[] {
  const filled = (value: string | null | undefined): value is string => Boolean(value && clean(value).trim())
  const seen = new Set<string>(excludeId ? [publishedId(excludeId)] : [])
  const items: { report: R; picked: boolean }[] = []

  const add = (report: R | null, picked: boolean) => {
    if (!report || !filled(report.title) || seen.has(report._id) || items.length >= RELATED_RESEARCH_COUNT) {
      return
    }

    seen.add(report._id)
    items.push({ report, picked })
  }

  for (const pick of picks ?? []) {
    add(pick, true)
  }

  for (const report of others) {
    add(report, false)
  }

  return items
}

type RichTextValue = PortableTextProps['value']

/** The report page's in-page sections, by their anchor ids (the design's), in page order. */
export const RESEARCH_REPORT_SECTIONS = [
  'executive-summary',
  'key-findings',
  'contributors-methodology',
  'charts-insights',
  'research-partner',
  'related-research',
] as const

export type ResearchReportSectionId = (typeof RESEARCH_REPORT_SECTIONS)[number]

/**
 * The last segment of a report's Executive Summary page URL, /resource/{report slug}/{summary slug}: the report's
 * `summarySlug`, this by default (its initial value, and the value while the field is unset). Reports not yet moved off
 * the old `researchSummary` document use that document's own slug until the merge script copies it.
 */
export const RESEARCH_SUMMARY_DEFAULT_SLUG = 'executive-summary'

/** A summary slug: lowercase letters, digits and hyphens, no hyphen at either end. */
export const RESEARCH_SUMMARY_SLUG = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/

/** The Executive Summary page's path under a report's own path: /resource/{slug}/{summary slug}. */
export const executiveSummaryPath = (reportPath: string, summarySlug: string): string =>
  `${reportPath}/${encodeURIComponent(summarySlug)}`

/** A block array, or null for an empty one or any other value (a string left from before the rich text change). */
export const blocksOrNull = <T>(value: T[] | null | undefined): T[] | null =>
  Array.isArray(value) && value.length > 0 ? value : null

/**
 * Whether an Executive Summary page has content: a lead, an introduction or at least one section
 * with a heading or text. Without one the page is a 404 and the report page shows no link to it.
 */
export function hasExecutiveSummary(
  summary:
    | { lead?: unknown[] | null; intro?: unknown[] | null; sections?: { heading?: string | null; body?: unknown[] | null }[] | null }
    | null
    | undefined,
  clean: (value: string) => string = (value) => value,
): boolean {
  if (!summary) {
    return false
  }

  const filled = (value: string | null | undefined) => Boolean(value && clean(value).trim())

  return (
    blocksOrNull(summary.lead) !== null ||
    blocksOrNull(summary.intro) !== null ||
    (summary.sections ?? []).some((section) => filled(section.heading) || blocksOrNull(section.body) !== null)
  )
}

export type LinkView = { label: string; href: string }

export type ResearchReportCardView = {
  key: string
  title: string
  href: string | null
  /** ISO date-time and its display form. */
  publishedAt: string | null
  date: string | null
  cover: MediaImage | null
}

/** The research report page (/resource/{slug}) as plain props. A section without content is null, its nav link too. */
export type ResearchReportView = {
  title: string
  breadcrumb: BreadcrumbItem[]
  typeLabel: string
  edition: string | null
  publishedAt: string | null
  date: string | null
  standfirst: string | null
  /** The download form or Issuu link, else the PDF; null without either. */
  download: LinkView | null
  cover: MediaImage | null
  nav: { id: ResearchReportSectionId; label: string }[]
  summary: { heading: HeadingView; text: RichTextValue | null; fullSummary: LinkView | null } | null
  keyFindings: { heading: HeadingView; items: { key: string; value: string; text: string; note: string | null }[] } | null
  methodology: {
    heading: HeadingView
    intro: RichTextValue | null
    rows: { key: string; label: string; value: string }[]
    contributors: { key: string; name: string }[]
  } | null
  /** Charts and selected insights: shown when either list has items; the subheading only with insights. */
  insights: { heading: HeadingView; charts: ResearchChart[]; subheading: HeadingView; items: string[] } | null
  researchPartner: {
    heading: HeadingView
    name: string
    logo: MediaImage | null
    description: string | null
    profile: LinkView | null
  } | null
  relatedResearch: { heading: HeadingView; items: ResearchReportCardView[] } | null
  mostRead: { heading: HeadingView; items: ArticleCardView[] } | null
  ads: { top: AdUnitView | null; side: AdUnitView | null }
}

/** The Executive Summary page (/resource/{slug}/{summary slug}) as plain props. One column, no ads or sidebar (design v1.0). */
export type ExecutiveSummaryView = {
  title: string
  breadcrumb: BreadcrumbItem[]
  typeLabel: string
  /** Report, edition, date and research partner, the ones the report has. */
  details: { key: string; label: string; value: string }[]
  lead: RichTextValue | null
  intro: RichTextValue | null
  sections: { key: string; heading: string | null; body: RichTextValue | null }[]
  keyTakeaways: { heading: HeadingView; items: { key: string; value: string; text: string; note: string | null }[] } | null
  back: LinkView
}
