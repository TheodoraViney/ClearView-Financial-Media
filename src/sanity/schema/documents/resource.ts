import { DocumentPdfIcon } from '@sanity/icons/DocumentPdf'
import { defineArrayMember, defineField, defineType } from 'sanity'

import {
  KEY_FINDINGS_MAX,
  RELATED_RESEARCH_COUNT,
  RESEARCH_CHART_GAUGES_MAX,
  RESEARCH_CHARTS_MAX,
  RESEARCH_SUMMARY_DEFAULT_SLUG,
  RESEARCH_SUMMARY_MAX_CHARS,
  RESEARCH_SUMMARY_SLUG,
  hasExecutiveSummary,
  publishedId,
} from '@/lib/research-report'
import { AutoFillPicksInput } from '@/sanity/components/auto-fill-picks-input'
import { ResearchGenerateInput } from '@/sanity/components/research-generate-input'

import { altField, keyFindingMember, legacyWpIdField } from '../fields'
import { blocksTextLength, paragraphsBlock } from '../objects/rich-text'
import { seoField } from '../objects/seo'

/**
 * A downloadable research report or post-forum report. 12 records.
 *
 * URLs are preserved: /resource/{slug}/ stays as it is, and
 * /resource-categories/research/ is a live listing with its own title and
 * canonical, so `category` has to survive the migration.
 *
 * Each report has a page at /resource/{slug} on ClearView Publishing, and an
 * Executive Summary page at /resource/{slug}/{summarySlug, default
 * executive-summary} from its "Executive summary page" fields (`summaryLead`,
 * `summaryIntro`, `summarySections`), shown while one of them has content. Each
 * page has its SEO metadata (`seo`, `summarySeo`). The "Page content" fields
 * are optional: the page hides a section, and its tab, while the section is
 * empty. The pages' labels live on the "Resource page texts" document
 * (RESEARCH_REPORT_PAGE_ID).
 *
 * Three source fields are empty on all 12 records and are not carried over:
 * `make_author_company`, `cyph_author_company` and `resource_running_time`.
 *
 * `download_thumbnail` is one ACF image field in WordPress but holds two kinds of
 * attachment: 6 of the 12 records point at a real image, the other 6 at the report
 * PDF itself (`FWRCybersecurityForumReport2026.pdf` and five more). An `image`
 * field cannot hold a PDF, so the two are split here and the migration routes each
 * attachment by its MIME type.
 *
 * `download_url` holds a download form or an Issuu link: 9 Profundcom forms,
 * 2 Issuu links, 1 Jotform. The download button uses it first and falls back to
 * `downloadFile` only when it is empty.
 */
/** A section of the Executive Summary page: a heading beside its text. */
const executiveSummarySectionMember = defineArrayMember({
  type: 'object',
  name: 'executiveSummarySection',
  title: 'Section',
  fields: [
    defineField({
      name: 'heading',
      title: 'Heading',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'body',
      title: 'Text',
      type: 'array',
      of: [paragraphsBlock],
      validation: (Rule) => Rule.required(),
    }),
  ],
  preview: {
    select: { title: 'heading' },
  },
})

export const resource = defineType({
  name: 'resource',
  title: 'Resource',
  type: 'document',
  icon: DocumentPdfIcon,
  // The "Generate from report text" panel at the top of Page content (it writes several fields at once).
  components: { input: ResearchGenerateInput },
  groups: [
    { name: 'details', title: 'Header', default: true },
    { name: 'download', title: 'Download' },
    { name: 'page', title: 'Page content' },
    { name: 'summary', title: 'Executive summary page' },
    { name: 'seo', title: 'SEO' },
    { name: 'summarySeo', title: 'Summary SEO' },
  ],
  fieldsets: [{ name: 'summaryPage', title: 'Executive summary page' }],
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      group: 'details',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      group: 'details',
      options: { source: 'title', maxLength: 96 },
      description: 'Changing it breaks a live URL.',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'publishedAt',
      title: 'Published at',
      type: 'datetime',
      group: 'details',
      initialValue: () => new Date().toISOString(),
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'category',
      title: 'Category',
      type: 'string',
      group: 'details',
      options: {
        list: [{ title: 'Research', value: 'research' }],
      },
      // Every report lists on /resource-categories/research and in Highlights only with category "research", and it
      // is the one value there is, so editors never see the field: new reports get it as their initial value.
      // Show it again once the client confirms more categories.
      initialValue: 'research',
      hidden: true,
    }),
    defineField({
      name: 'edition',
      title: 'Edition',
      type: 'string',
      group: 'details',
    }),
    defineField({
      name: 'standfirst',
      title: 'Standfirst',
      type: 'text',
      rows: 3,
      group: 'details',
    }),
    defineField({
      name: 'downloadThumbnail',
      title: 'Download thumbnail',
      type: 'image',
      group: 'download',
      description: 'The report cover on the page and in research lists.',
      options: { hotspot: true },
      fields: [altField],
    }),
    defineField({
      name: 'downloadFile',
      title: 'Download file',
      type: 'file',
      group: 'download',
      description: 'Used only when Download URL or form is empty.',
    }),
    defineField({
      name: 'downloadUrl',
      title: 'Download URL or form',
      type: 'url',
      group: 'download',
      validation: (Rule) => Rule.uri({ scheme: ['http', 'https'] }),
    }),
    // The AI source: first in Page content, so the Generate panel (research-generate-input.tsx) sits right under it
    // and above every field it fills.
    defineField({
      name: 'body',
      title: 'Report text',
      type: 'richText',
      group: 'page',
      description: 'Not shown on the page: feeds site search and the Generate from report text button.',
    }),
    defineField({
      name: 'summary',
      title: 'Short summary (report page)',
      type: 'array',
      group: 'page',
      of: [paragraphsBlock],
      validation: (Rule) =>
        Rule.custom((blocks) =>
          blocksTextLength(blocks) > RESEARCH_SUMMARY_MAX_CHARS
            ? `Keep it to one short paragraph (about ${RESEARCH_SUMMARY_MAX_CHARS} characters).`
            : true,
        ).warning(),
    }),
    defineField({
      name: 'keyFindings',
      title: 'Key findings',
      type: 'array',
      group: 'page',
      description: 'Also shown as Key takeaways on the Executive Summary page.',
      of: [keyFindingMember({ withNote: true })],
      validation: (Rule) => Rule.max(KEY_FINDINGS_MAX),
    }),
    defineField({
      name: 'methodologyIntro',
      title: 'Methodology introduction',
      type: 'array',
      group: 'page',
      of: [paragraphsBlock],
    }),
    defineField({
      name: 'authors',
      title: 'Participants and authors',
      type: 'array',
      group: 'page',
      of: [defineArrayMember({ type: 'reference', to: [{ type: 'person' }] })],
      validation: (Rule) => Rule.unique(),
    }),
    defineField({
      name: 'methodology',
      title: 'Methodology details',
      type: 'array',
      group: 'page',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'methodologyRow',
          title: 'Row',
          fieldsets: [{ name: 'row', title: 'Row', options: { columns: 2 } }],
          fields: [
            defineField({
              name: 'label',
              title: 'Label',
              type: 'string',
              fieldset: 'row',
              validation: (Rule) => Rule.required(),
            }),
            defineField({
              name: 'value',
              title: 'Value',
              type: 'string',
              fieldset: 'row',
              validation: (Rule) => Rule.required(),
            }),
          ],
          preview: {
            select: { title: 'label', subtitle: 'value' },
          },
        }),
      ],
    }),
    defineField({
      name: 'charts',
      title: 'Charts',
      type: 'array',
      group: 'page',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'researchChart',
          title: 'Chart',
          fields: [
            defineField({
              name: 'title',
              title: 'Title',
              type: 'string',
              validation: (Rule) => Rule.required(),
            }),
            defineField({
              name: 'note',
              title: 'Note',
              type: 'text',
              rows: 2,
            }),
            defineField({
              name: 'gauges',
              title: 'Gauges',
              type: 'array',
              of: [
                defineArrayMember({
                  type: 'object',
                  name: 'researchGauge',
                  title: 'Gauge',
                  fieldsets: [
                    { name: 'figure', title: 'Figure', options: { columns: 2 } },
                    { name: 'arc', title: 'Arc', options: { columns: 2 } },
                  ],
                  fields: [
                    defineField({
                      name: 'label',
                      title: 'Label',
                      type: 'string',
                      fieldset: 'figure',
                      validation: (Rule) => Rule.required(),
                    }),
                    defineField({
                      name: 'value',
                      title: 'Figure',
                      type: 'string',
                      fieldset: 'figure',
                      validation: (Rule) => Rule.required(),
                    }),
                    defineField({
                      name: 'percent',
                      title: 'Arc fill (%)',
                      type: 'number',
                      fieldset: 'arc',
                      description: 'For a score, its share of the scale: 5.3 out of 7 is 75.7.',
                      validation: (Rule) => Rule.required().min(0).max(100),
                    }),
                    defineField({
                      name: 'current',
                      title: 'Highlight',
                      type: 'boolean',
                      fieldset: 'arc',
                      initialValue: false,
                    }),
                  ],
                  preview: {
                    select: { title: 'value', subtitle: 'label', percent: 'percent' },
                    prepare: ({ title, subtitle, percent }) => ({
                      title: title || 'No figure',
                      subtitle: [subtitle, typeof percent === 'number' ? `${percent}% of the arc` : null]
                        .filter(Boolean)
                        .join(' · '),
                    }),
                  },
                }),
              ],
              validation: (Rule) => Rule.required().min(1).max(RESEARCH_CHART_GAUGES_MAX),
            }),
          ],
          preview: {
            select: { title: 'title', first: 'gauges.0.value', second: 'gauges.1.value' },
            prepare: ({ title, first, second }) => ({
              title: title || 'Untitled chart',
              subtitle: [first, second].filter(Boolean).join(' · '),
            }),
          },
        }),
      ],
      validation: (Rule) => Rule.max(RESEARCH_CHARTS_MAX),
    }),
    defineField({
      name: 'insights',
      title: 'Selected insights',
      type: 'array',
      group: 'page',
      of: [defineArrayMember({ type: 'string', validation: (Rule) => Rule.required() })],
    }),
    defineField({
      name: 'researchPartner',
      title: 'Research partner',
      type: 'object',
      group: 'page',
      options: { collapsible: false },
      fields: [
        defineField({
          name: 'company',
          title: 'Company',
          type: 'reference',
          to: [{ type: 'company' }],
          options: { disableNew: true },
          validation: (Rule) =>
            Rule.custom((value, context) => {
              const parent = context.parent as { description?: string } | undefined

              return value || !parent?.description?.trim() ? true : 'Choose the company, or clear the description'
            }),
        }),
        defineField({
          name: 'description',
          title: 'Description',
          type: 'text',
          rows: 2,
        }),
      ],
    }),
    defineField({
      name: 'partnerCategories',
      title: 'Partners (from WordPress)',
      type: 'array',
      group: 'page',
      // Legacy WordPress field, not in the new design: hidden in the Studio, data kept. Remove before launch if unused.
      hidden: true,
      of: [defineArrayMember({ type: 'companyGroup' })],
    }),
    defineField({
      name: 'relatedResearch',
      title: 'Related research',
      type: 'array',
      group: 'page',
      description: 'Empty places fill automatically with the latest reports.',
      components: { input: AutoFillPicksInput },
      of: [
        defineArrayMember({
          type: 'reference',
          to: [{ type: 'resource' }],
          options: {
            disableNew: true,
            filter: ({ document }) => {
              const id = publishedId(document._id)

              return { filter: '!(_id in [$id, $draft])', params: { id, draft: `drafts.${id}` } }
            },
          },
        }),
      ],
      validation: (Rule) =>
        Rule.max(RELATED_RESEARCH_COUNT)
          .unique()
          .custom((items: { _ref?: string }[] | undefined, context) => {
            const id = context.document?._id ? publishedId(context.document._id) : null

            return id && (items ?? []).some((item) => item._ref === id) ? 'A report cannot be related to itself' : true
          }),
    }),
    defineField({
      name: 'summarySlug',
      title: 'Slug',
      type: 'slug',
      group: 'summary',
      fieldset: 'summaryPage',
      description: 'Changing it breaks a live URL.',
      initialValue: { current: RESEARCH_SUMMARY_DEFAULT_SLUG },
      // The URL sits under the report's own slug, so every report may use the same summary slug.
      options: { isUnique: () => true },
      validation: (Rule) =>
        Rule.custom((value) => {
          const slug = value?.current ?? ''

          // A URL segment as typed: no ".", "..", "%" or uppercase, which would not round-trip or would resolve away.
          return slug && !RESEARCH_SUMMARY_SLUG.test(slug)
            ? 'Use lowercase letters, numbers and hyphens only, not starting or ending with a hyphen'
            : true
        }),
    }),
    defineField({
      name: 'summaryLead',
      title: 'Lead paragraph',
      type: 'array',
      group: 'summary',
      fieldset: 'summaryPage',
      description: 'The page exists only while this tab has a lead, introduction or section.',
      of: [paragraphsBlock],
    }),
    defineField({
      name: 'summaryIntro',
      title: 'Introduction',
      type: 'array',
      group: 'summary',
      fieldset: 'summaryPage',
      of: [paragraphsBlock],
    }),
    defineField({
      name: 'summarySections',
      title: 'Sections',
      type: 'array',
      group: 'summary',
      fieldset: 'summaryPage',
      of: [executiveSummarySectionMember],
    }),
    seoField({ title: 'Report page SEO' }),
    defineField({
      name: 'summarySeo',
      title: 'Executive Summary page SEO',
      type: 'seo',
      group: 'summarySeo',
      validation: (Rule) =>
        Rule.custom((value, context) => {
          const report = context.document as
            | { summaryLead?: unknown[]; summaryIntro?: unknown[]; summarySections?: { heading?: string; body?: unknown[] }[] }
            | undefined
          const summary = { lead: report?.summaryLead, intro: report?.summaryIntro, sections: report?.summarySections }

          return value || !hasExecutiveSummary(summary) ? true : 'Required while the Executive Summary page has content'
        }),
    }),
    legacyWpIdField,
  ],
  orderings: [
    {
      title: 'Published, newest first',
      name: 'publishedAtDesc',
      by: [{ field: 'publishedAt', direction: 'desc' }],
    },
  ],
  preview: {
    select: {
      title: 'title',
      category: 'category',
      slug: 'slug.current',
      publishedAt: 'publishedAt',
      media: 'downloadThumbnail',
    },
    prepare({ title, category, slug, publishedAt, media }) {
      const date = typeof publishedAt === 'string' ? publishedAt.slice(0, 10) : undefined
      const label = category || (slug ? `/resource/${slug}` : 'No category')

      return {
        title: title || 'Untitled resource',
        subtitle: [label, date].filter(Boolean).join(' · '),
        media,
      }
    },
  },
})
