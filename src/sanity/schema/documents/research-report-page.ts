import { DocumentPdfIcon } from '@sanity/icons/DocumentPdf'
import { defineField, defineType } from 'sanity'

import type { ResearchReportPageCopyKey } from '@/lib/research-report-copy'

import { headingField } from '../fields'

/*
 * The research report template's labels: one document with the fixed id RESEARCH_REPORT_PAGE_ID from `src/brands.ts`,
 * opened from the ClearView folder in the Studio, because the page lives on ClearView Publishing only. It covers the
 * report page (/resource/{slug}) and its Executive Summary page (/resource/{slug}/{summary slug}). The report's
 * own content (standfirst, summary, key findings, methodology, insights, partner) lives on the resource document.
 * The design texts are the fields' initial values only: the page renders what is stored. Screen-reader-only text
 * stays in code.
 */

const label = (
  name: ResearchReportPageCopyKey,
  title: string,
  description: string,
  group: string,
  initialValue: string,
) =>
  defineField({
    name,
    title,
    type: 'string',
    description,
    group,
    initialValue,
    validation: (Rule) => Rule.required(),
  })

const heading = (
  name: string,
  title: string,
  description: string,
  initialText: string,
  group = 'page',
  defaultLevel: 'h2' | 'h3' = 'h2',
) =>
  headingField(name, {
    title,
    defaultLevel,
    initialText,
    required: true,
    group,
    description: `${description} Choose the heading level in the style menu. The size on the page stays the same.`,
  })

const NAV = 'In-page navigation link. Hidden when the section is empty.'

export const researchReportPage = defineType({
  name: 'researchReportPage',
  title: 'Research report page',
  type: 'document',
  icon: DocumentPdfIcon,
  groups: [
    { name: 'page', title: 'Report page', default: true },
    { name: 'navigation', title: 'Navigation' },
    { name: 'summary', title: 'Executive Summary page' },
    { name: 'sidebar', title: 'Sidebar' },
  ],
  fields: [
    label('breadcrumbHomeLabel', 'Breadcrumb home label', 'First item of the breadcrumb, linking to the home page.', 'page', 'Home'),
    label(
      'breadcrumbResearchLabel',
      'Breadcrumb research label',
      'Second item of the breadcrumb, linking to the research list. Used on both pages.',
      'page',
      'Research',
    ),
    label('typeLabel', 'Type label', 'Shown above the report title on both pages.', 'page', 'Research report'),
    label(
      'downloadLabel',
      'Download button label',
      "Button that opens the report's download form, or its PDF when there is no form. Hidden when the report has neither.",
      'page',
      'Download report',
    ),
    heading('executiveSummaryHeading', 'Executive summary heading', 'Heading above the short executive summary.', 'Executive summary'),
    label(
      'readFullSummaryLabel',
      'Full summary link label',
      'Link to the Executive Summary page. Hidden when the report has no full summary.',
      'page',
      'Read full Executive Summary',
    ),
    heading('keyFindingsHeading', 'Key findings heading', 'Heading above the key findings.', 'Key findings'),
    heading(
      'methodologyHeading',
      'Contributors and methodology heading',
      'Heading above the methodology and the contributors.',
      'Contributors / methodology',
    ),
    heading('insightsHeading', 'Insights section heading', 'Heading of the section with the selected insights.', 'Charts and selected insights'),
    heading(
      'selectedInsightsHeading',
      'Selected insights heading',
      'Smaller heading directly above the numbered insights.',
      'Selected insights',
      'page',
      'h3',
    ),
    heading('researchPartnerHeading', 'Research partner heading', 'Heading of the research partner card.', 'Research partner'),
    label(
      'companyProfileLabel',
      'Company profile link label',
      "Link to the partner company's website. Hidden when the company has no website.",
      'page',
      'Company profile',
    ),
    heading('relatedResearchHeading', 'Related research heading', 'Heading above the related reports.', 'Related research'),

    label('navExecutiveSummaryLabel', 'Executive summary link', NAV, 'navigation', 'Executive Summary'),
    label('navKeyFindingsLabel', 'Key findings link', NAV, 'navigation', 'Key Findings'),
    label('navMethodologyLabel', 'Contributors and methodology link', NAV, 'navigation', 'Contributors / Methodology'),
    label('navInsightsLabel', 'Insights link', NAV, 'navigation', 'Charts and Selected Insights'),
    label('navResearchPartnerLabel', 'Research partner link', NAV, 'navigation', 'Research Partner'),
    label('navRelatedResearchLabel', 'Related research link', NAV, 'navigation', 'Related Research'),

    label(
      'summaryBreadcrumbLabel',
      'Breadcrumb label',
      'Last item of the breadcrumb on the Executive Summary page.',
      'summary',
      'Executive Summary',
    ),
    label('summaryTitle', 'Page title', 'Main heading of the Executive Summary page.', 'summary', 'Executive Summary'),
    label('summaryReportLabel', 'Report label', 'Label of the report title in the details list.', 'summary', 'Report'),
    label(
      'summaryEditionLabel',
      'Edition label',
      'Label of the edition in the details list. Hidden when the report has no edition.',
      'summary',
      'Edition',
    ),
    label('summaryDateLabel', 'Date label', 'Label of the publish date in the details list.', 'summary', 'Date'),
    label(
      'summaryPartnerLabel',
      'Research partner label',
      'Label of the research partner in the details list. Hidden when the report has no partner.',
      'summary',
      'Research partner',
    ),
    heading('keyTakeawaysHeading', 'Key takeaways heading', "Heading above the report's key findings.", 'Key takeaways', 'summary'),
    label('backToReportLabel', 'Back link label', 'Link back to the report page.', 'summary', 'Back to the full report'),

    heading('mostReadHeading', 'Most read heading', 'Heading of the most read list beside the report.', 'Most Read', 'sidebar'),
  ],
  preview: {
    prepare() {
      return { title: 'Research report page', media: DocumentPdfIcon }
    },
  },
})
