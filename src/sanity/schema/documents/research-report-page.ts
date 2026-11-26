import { DocumentPdfIcon } from '@sanity/icons/DocumentPdf'
import { defineField, defineType } from 'sanity'

import type { ResearchReportPageCopyKey } from '@/lib/research-report-copy'

/*
 * "Resource page texts": the research report template's labels, one document with the fixed id RESEARCH_REPORT_PAGE_ID
 * from `src/brands.ts`, opened from the Resources folder in the Studio. The page lives on ClearView Publishing only.
 * It covers the report page (/resource/{slug}) and its Executive Summary page (/resource/{slug}/{summary slug}). The
 * report's own content (standfirst, summary, key findings, methodology, insights, partner) lives on the resource
 * document.
 * Tabs and fieldsets follow the page from top to bottom; a section's heading and its menu link sit side by side.
 * Section headings are plain strings rendered as h2; the Selected insights subheading renders as h3.
 * The design texts are the fields' initial values only: the page renders what is stored. Screen-reader-only text
 * stays in code.
 */

type FieldOptions = { description?: string; fieldset?: string; group?: string }

const label = (name: ResearchReportPageCopyKey, title: string, initialValue: string, options: FieldOptions = {}) =>
  defineField({ name, title, type: 'string', initialValue, validation: (Rule) => Rule.required(), group: 'sections', ...options })

const heading = (name: string, initialValue: string, options: FieldOptions & { title?: string } = {}) =>
  defineField({ name, title: 'Heading', type: 'string', initialValue, validation: (Rule) => Rule.required(), group: 'sections', ...options })

/** A section of the page: its heading and its link in the menu under the header, side by side. */
const section = (name: string, headingName: string, headingText: string, navName: ResearchReportPageCopyKey, navText: string) => [
  heading(headingName, headingText, { fieldset: name }),
  label(navName, 'Menu link', navText, { fieldset: name }),
]

export const researchReportPage = defineType({
  name: 'researchReportPage',
  title: 'Resource page texts',
  type: 'document',
  icon: DocumentPdfIcon,
  groups: [
    { name: 'header', title: 'Header', default: true },
    { name: 'sections', title: 'Sections' },
    { name: 'sidebar', title: 'Sidebar' },
    { name: 'summary', title: 'Executive Summary page' },
  ],
  fieldsets: [
    { name: 'breadcrumb', title: 'Breadcrumb', description: 'Also used on the Executive Summary page.', options: { columns: 2 } },
    { name: 'executiveSummary', title: 'Executive summary', options: { columns: 2 } },
    { name: 'keyFindings', title: 'Key findings', options: { columns: 2 } },
    { name: 'methodology', title: 'Contributors and methodology', options: { columns: 2 } },
    { name: 'insights', title: 'Charts and selected insights', options: { columns: 2 } },
    { name: 'researchPartner', title: 'Research partner', options: { columns: 2 } },
    { name: 'relatedResearch', title: 'Related research', options: { columns: 2 } },
    { name: 'summaryHeader', title: 'Header', options: { columns: 2 } },
    { name: 'summaryDetails', title: 'Details list', options: { columns: 2 } },
  ],
  fields: [
    // Header
    label('breadcrumbHomeLabel', 'Home', 'Home', { group: 'header', fieldset: 'breadcrumb' }),
    label('breadcrumbResearchLabel', 'Research', 'Research', { group: 'header', fieldset: 'breadcrumb' }),
    label('typeLabel', 'Type label', 'Research report', {
      group: 'header',
      description: 'Above the title on both pages.',
    }),
    label('downloadLabel', 'Download button', 'Download report', {
      group: 'header',
      description: 'Opens the download form, else the PDF. Hidden when the report has neither.',
    }),

    // Sections, in page order. A menu link is hidden while its section is empty.
    ...section('executiveSummary', 'executiveSummaryHeading', 'Executive summary', 'navExecutiveSummaryLabel', 'Executive Summary'),
    label('readFullSummaryLabel', 'Full summary link', 'Read full Executive Summary', {
      fieldset: 'executiveSummary',
      description: 'Hidden when the report has no Executive Summary page.',
    }),

    ...section('keyFindings', 'keyFindingsHeading', 'Key findings', 'navKeyFindingsLabel', 'Key Findings'),
    ...section('methodology', 'methodologyHeading', 'Contributors / methodology', 'navMethodologyLabel', 'Contributors / Methodology'),

    ...section('insights', 'insightsHeading', 'Charts and selected insights', 'navInsightsLabel', 'Charts and Selected Insights'),
    heading('selectedInsightsHeading', 'Selected insights', { fieldset: 'insights', title: 'Subheading' }),

    ...section('researchPartner', 'researchPartnerHeading', 'Research partner', 'navResearchPartnerLabel', 'Research Partner'),
    label('companyProfileLabel', 'Website link', 'Company profile', {
      fieldset: 'researchPartner',
      description: 'Hidden when the company has no website.',
    }),

    ...section('relatedResearch', 'relatedResearchHeading', 'Related research', 'navRelatedResearchLabel', 'Related Research'),

    // Sidebar
    heading('mostReadHeading', 'Most Read', { group: 'sidebar', title: 'Most read heading' }),

    // Executive Summary page
    label('summaryBreadcrumbLabel', 'Breadcrumb', 'Executive Summary', {
      group: 'summary',
      fieldset: 'summaryHeader',
      description: 'Last item, after Home and Research.',
    }),
    label('summaryTitle', 'Page title', 'Executive Summary', { group: 'summary', fieldset: 'summaryHeader' }),
    label('summaryReportLabel', 'Report', 'Report', { group: 'summary', fieldset: 'summaryDetails' }),
    label('summaryEditionLabel', 'Edition', 'Edition', { group: 'summary', fieldset: 'summaryDetails' }),
    label('summaryDateLabel', 'Date', 'Date', { group: 'summary', fieldset: 'summaryDetails' }),
    label('summaryPartnerLabel', 'Research partner', 'Research partner', { group: 'summary', fieldset: 'summaryDetails' }),
    heading('keyTakeawaysHeading', 'Key takeaways', { group: 'summary', title: 'Key takeaways heading' }),
    label('backToReportLabel', 'Back link', 'Back to the full report', { group: 'summary' }),
  ],
  preview: {
    prepare() {
      return { title: 'Resource page texts', media: DocumentPdfIcon }
    },
  },
})
