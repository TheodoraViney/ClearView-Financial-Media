/*
 * Visible labels of the research report page and its Executive Summary page, edited in the "Resource page texts"
 * document (Resources folder in the Studio). The design texts live only as the fields' initial values in the schema;
 * the pages render the stored values. Section headings are plain strings, read separately and rendered as h2 (the
 * Selected insights subheading as h3).
 * Screen-reader-only text stays in code. Pure: no Sanity or Next imports.
 */

export const RESEARCH_REPORT_PAGE_COPY_KEYS = [
  'breadcrumbHomeLabel',
  'breadcrumbResearchLabel',
  'typeLabel',
  'downloadLabel',
  'readFullSummaryLabel',
  'companyProfileLabel',
  'navExecutiveSummaryLabel',
  'navKeyFindingsLabel',
  'navMethodologyLabel',
  'navInsightsLabel',
  'navResearchPartnerLabel',
  'navRelatedResearchLabel',
  'summaryBreadcrumbLabel',
  'summaryTitle',
  'summaryReportLabel',
  'summaryEditionLabel',
  'summaryDateLabel',
  'summaryPartnerLabel',
  'backToReportLabel',
] as const

export type ResearchReportPageCopyKey = (typeof RESEARCH_REPORT_PAGE_COPY_KEYS)[number]

export type ResearchReportPageCopy = Record<ResearchReportPageCopyKey, string>
