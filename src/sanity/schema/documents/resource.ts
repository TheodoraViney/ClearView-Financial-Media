import { DocumentPdfIcon } from '@sanity/icons/DocumentPdf'
import { defineArrayMember, defineField, defineType } from 'sanity'

import {
  KEY_FINDINGS_MAX,
  RELATED_RESEARCH_COUNT,
  RESEARCH_CHART_GAUGES_MAX,
  RESEARCH_CHARTS_MAX,
  RESEARCH_SUMMARY_MAX_CHARS,
  publishedId,
} from '@/lib/research-report'
import { AutoFillPicksInput } from '@/sanity/components/auto-fill-picks-input'
import { ResearchGenerateInput } from '@/sanity/components/research-generate-input'

import { altField, imageField, keyFindingMember, legacyWpIdField } from '../fields'
import { blocksTextLength, paragraphsBlock } from '../objects/rich-text'

/**
 * A downloadable research report or post-forum report. 12 records.
 *
 * URLs are preserved: /resource/{slug}/ stays as it is, and
 * /resource-categories/research/ is a live listing with its own title and
 * canonical, so `category` has to survive the migration.
 *
 * Each report has a page at /resource/{slug} on ClearView Publishing, and an
 * Executive Summary page at /resource/{slug}/{summary slug} from its own
 * `researchSummary` document (`executiveSummaryPage`, required, one per
 * report), shown while that document has content. The "Page content" fields
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
export const resource = defineType({
  name: 'resource',
  title: 'Resource',
  type: 'document',
  icon: DocumentPdfIcon,
  // The "Generate from report text" panel at the top of Page content (it writes several fields at once).
  components: { input: ResearchGenerateInput },
  groups: [
    { name: 'details', title: 'Details', default: true },
    { name: 'page', title: 'Page content' },
    { name: 'summary', title: 'Executive Summary' },
    { name: 'download', title: 'Download' },
  ],
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
      description: 'Published at /resource/{slug}/. Migrated from WordPress, changing it breaks a live URL.',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'publishedAt',
      title: 'Published at',
      type: 'datetime',
      group: 'details',
      description:
        'Orders the Research list on the site and is the date shown on the report page. Migrated from the WordPress publish date.',
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
    imageField('featuredImage', {
      title: 'Banner image',
      group: 'details',
      description:
        'Wide banner (1200×627) used when the report is shared. Migrated from the WordPress featured image.',
    }),
    defineField({
      name: 'body',
      title: 'Report text',
      type: 'richText',
      group: 'details',
      description:
        'Not shown on the report page. Used by site search, as the page description for search engines while Standfirst and Executive summary are empty, and by the Generate from report text button in Page content. For a new report, paste the report’s text here, for example from the PDF.',
    }),
    defineField({
      name: 'authors',
      title: 'Participants and authors',
      type: 'array',
      group: 'details',
      description: 'Shown by name as the contributors on the report page. Hidden when empty.',
      of: [defineArrayMember({ type: 'reference', to: [{ type: 'person' }] })],
      validation: (Rule) => Rule.unique(),
    }),

    defineField({
      name: 'edition',
      title: 'Edition',
      type: 'string',
      group: 'page',
      description: 'Optional. Shown beside the date under the title, for example "Twelfth Edition".',
    }),
    defineField({
      name: 'standfirst',
      title: 'Standfirst',
      type: 'text',
      rows: 3,
      group: 'page',
      description: 'Optional. A short introduction under the title, above the download button.',
    }),
    defineField({
      name: 'summary',
      title: 'Executive summary',
      type: 'array',
      group: 'page',
      description:
        'Optional. One short paragraph in the Executive summary section of the report page. Bold, italic and links only. Without it, and without a full Executive Summary page, the section and its tab are hidden.',
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
      description: `Optional. Up to ${KEY_FINDINGS_MAX} figures. Shown as Key findings on the report page and as Key takeaways on the Executive Summary page. Hidden when empty.`,
      of: [keyFindingMember({ withNote: true })],
      validation: (Rule) => Rule.max(KEY_FINDINGS_MAX),
    }),
    defineField({
      name: 'methodologyIntro',
      title: 'Methodology introduction',
      type: 'array',
      group: 'page',
      description:
        'Optional. A paragraph about the study in the Contributors / methodology section. Bold, italic and links only.',
      of: [paragraphsBlock],
    }),
    defineField({
      name: 'methodology',
      title: 'Methodology details',
      type: 'array',
      group: 'page',
      description:
        'Optional. Label and value rows under the introduction, for example "Study format" and "Annual industry research report". The section and its tab are hidden when this, the introduction and the contributors are all empty.',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'methodologyRow',
          title: 'Row',
          fields: [
            defineField({
              name: 'label',
              title: 'Label',
              type: 'string',
              validation: (Rule) => Rule.required(),
            }),
            defineField({
              name: 'value',
              title: 'Value',
              type: 'string',
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
      description: `Optional. Up to ${RESEARCH_CHARTS_MAX} chart cards, shown in this order in the Charts and selected insights section. Each card shows one or two half-circle gauges.`,
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
              description: 'What the chart shows, for example "Average digitisation progress score".',
              validation: (Rule) => Rule.required(),
            }),
            defineField({
              name: 'note',
              title: 'Note',
              type: 'text',
              rows: 2,
              description: 'Optional. A short line explaining the figures, shown at the foot of the card.',
            }),
            defineField({
              name: 'gauges',
              title: 'Gauges',
              type: 'array',
              description:
                'One or two. Two gauges sit beside the title, for example last year and this year; one sits under it.',
              of: [
                defineArrayMember({
                  type: 'object',
                  name: 'researchGauge',
                  title: 'Gauge',
                  fields: [
                    defineField({
                      name: 'label',
                      title: 'Label',
                      type: 'string',
                      description: 'Under the gauge, for example "2024" or "Scores above 4".',
                      validation: (Rule) => Rule.required(),
                    }),
                    defineField({
                      name: 'value',
                      title: 'Figure',
                      type: 'string',
                      description:
                        'The figure as shown in the gauge, for example "5.3 / 7" or "70%". A number at its start counts up when the card scrolls into view.',
                      validation: (Rule) => Rule.required(),
                    }),
                    defineField({
                      name: 'percent',
                      title: 'Arc fill (%)',
                      type: 'number',
                      description:
                        'How much of the half circle is filled, 0 to 100. For a score, its share of the scale: 5.3 out of 7 is 75.7.',
                      validation: (Rule) => Rule.required().min(0).max(100),
                    }),
                    defineField({
                      name: 'current',
                      title: 'Highlight',
                      type: 'boolean',
                      description: 'Shows the figure in the brand colour, for example the latest year.',
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
      description:
        'Optional. Short statements, numbered on the page in this order. The Charts and selected insights section and its tab are hidden when this and Charts are both empty.',
      of: [defineArrayMember({ type: 'string', validation: (Rule) => Rule.required() })],
    }),
    defineField({
      name: 'researchPartner',
      title: 'Research partner',
      type: 'object',
      group: 'page',
      description: 'Optional. The company the report was produced with. Hidden when no company is chosen.',
      options: { collapsible: false },
      fields: [
        defineField({
          name: 'company',
          title: 'Company',
          type: 'reference',
          to: [{ type: 'company' }],
          description:
            'Its logo is shown, and the Company profile link opens its website. The link is hidden when the company has no website.',
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
          description: 'A sentence about the partnership, for example "Produced in conjunction with Alpha FMC."',
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
      description: 'Migrated from WordPress. Not shown on the site: the report page shows the Research partner above.',
      of: [defineArrayMember({ type: 'companyGroup' })],
    }),
    defineField({
      name: 'relatedResearch',
      title: 'Related research',
      type: 'array',
      group: 'page',
      description: `Optional. Up to ${RELATED_RESEARCH_COUNT} reports, shown first in this order. Empty places fill automatically with the latest other research reports.`,
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
      name: 'executiveSummaryPage',
      title: 'Executive Summary page',
      type: 'reference',
      group: 'summary',
      to: [{ type: 'researchSummary' }],
      description:
        'Required. The full summary page at /resource/{slug}/{its slug}. Choose an existing summary, create a new one here, or use Create Executive Summary page in Page content. A new summary is published on its own, before the report. While it has no lead, introduction or section, that page does not exist and the report page shows no link to it. Each summary belongs to one report.',
      options: {
        // Only summaries no other report uses.
        filter: ({ document }) => {
          const id = publishedId(document._id)

          return {
            filter: '!(_id in *[_type == "resource" && !(_id in [$id, $draft])].executiveSummaryPage._ref)',
            params: { id, draft: `drafts.${id}` },
          }
        },
      },
      validation: (Rule) =>
        Rule.required().custom(
          async (value: { _ref?: string; _strengthenOnPublish?: unknown } | undefined, context) => {
            const id = context.document?._id ? publishedId(context.document._id) : null

            if (!value?._ref || !id) {
              return true
            }

            const client = context.getClient({ apiVersion: '2026-09-01' })
            const taken = await client.fetch<string | null>(
              '*[_type == "resource" && executiveSummaryPage._ref == $ref && !(_id in [$id, $draft])][0].title',
              { ref: value._ref, id, draft: `drafts.${id}` },
            )

            if (taken !== null) {
              return `This summary already belongs to "${taken || 'another report'}". Create a new one.`
            }

            // A summary created here or with "Create Executive Summary page" is a weak reference until the report is
            // published, when it turns strong; a strong reference to an unpublished document cannot be saved, so the
            // report's publish would fail. The Studio checks again when the summary is published.
            if (value._strengthenOnPublish) {
              const published = await client.fetch<boolean>('count(*[_id == $ref]) > 0', { ref: value._ref })

              return published ? true : 'Publish the Executive Summary page first (open it above), then publish the report.'
            }

            return true
          },
        ),
    }),

    defineField({
      name: 'downloadThumbnail',
      title: 'Download thumbnail',
      type: 'image',
      group: 'download',
      description: 'The report cover, shown on the report page and in research lists.',
      options: { hotspot: true },
      fields: [altField],
    }),
    defineField({
      name: 'downloadFile',
      title: 'Download file',
      type: 'file',
      group: 'download',
      description:
        'The report PDF. The download button uses it only when the Download URL or form is empty. Half the migrated records arrive with one.',
    }),
    defineField({
      name: 'downloadUrl',
      title: 'Download URL or form',
      type: 'url',
      group: 'download',
      description:
        'The download form or Issuu link the download button opens. Used before the download file. Native registration forms are out of scope.',
      validation: (Rule) => Rule.uri({ scheme: ['http', 'https'] }),
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
