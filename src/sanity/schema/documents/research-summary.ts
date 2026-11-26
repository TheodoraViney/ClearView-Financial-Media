import { DocumentTextIcon } from '@sanity/icons/DocumentText'
import { defineArrayMember, defineField, defineType } from 'sanity'

import { paragraphsBlock } from '../objects/rich-text'

/** The slug every migrated and new Executive Summary starts with. */
export const RESEARCH_SUMMARY_DEFAULT_SLUG = 'executive-summary'

/** A summary slug: lowercase letters, digits and hyphens, no hyphen at either end. */
export const RESEARCH_SUMMARY_SLUG = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/

/** The plain text of the first paragraphs of a block array, for a Studio preview. */
function blocksText(blocks: unknown): string {
  if (!Array.isArray(blocks)) {
    return ''
  }

  return blocks
    .flatMap((block: { _type?: string; children?: { text?: string }[] }) =>
      block?._type === 'block' ? [(block.children ?? []).map((child) => child.text ?? '').join('')] : [],
    )
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * A research report's Executive Summary page, at /resource/{report slug}/{this slug} on ClearView Publishing. One per
 * report: the report points at it with its required `executiveSummaryPage` reference, and the reference is unique
 * across reports. The page exists only while this document has a lead, an introduction or a section. Its labels
 * (page title, details labels, Key takeaways heading, back link) live on the "Resource page texts" document, and the
 * Key takeaways are the report's own key findings.
 *
 * Document ids: `research-summary-{suffix of the report id}` for migrated ones, for example `research-summary-wp-36571`;
 * `research-summary-{random}` for one made with "Create Executive Summary page" on the report. Never a dot.
 *
 * Per-page SEO fields (title, description, share image) will be added here by the "SEO setup" work. Until then the
 * page's description comes from the lead, else the introduction, else the report's own description.
 */
export const researchSummary = defineType({
  name: 'researchSummary',
  title: 'Executive summary',
  type: 'document',
  icon: DocumentTextIcon,
  fields: [
    defineField({
      name: 'title',
      title: 'Studio title',
      type: 'string',
      description:
        'Optional. Names this summary in Studio lists, for example the report it belongs to. Not shown on the site: the page title comes from the "Resource page texts" document.',
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      description:
        'The last part of the page URL: /resource/{report slug}/{this slug}, for example /resource/tech-ops-report-2024/executive-summary. Changing it changes the live URL.',
      initialValue: { current: RESEARCH_SUMMARY_DEFAULT_SLUG },
      // The URL sits under the report's own slug, so every summary may use the same slug.
      options: { isUnique: () => true },
      validation: (Rule) =>
        Rule.required().custom((value) => {
          const slug = value?.current ?? ''

          // A URL segment as typed: no ".", "..", "%" or uppercase, which would not round-trip or would resolve away.
          return slug && !RESEARCH_SUMMARY_SLUG.test(slug)
            ? 'Use lowercase letters, numbers and hyphens only, not starting or ending with a hyphen'
            : true
        }),
    }),
    defineField({
      name: 'lead',
      title: 'Lead paragraph',
      type: 'array',
      description: 'The large opening paragraph. Bold, italic and links only.',
      of: [paragraphsBlock],
    }),
    defineField({
      name: 'intro',
      title: 'Introduction',
      type: 'array',
      description: 'Paragraphs under the lead. Bold, italic and links only.',
      of: [paragraphsBlock],
    }),
    defineField({
      name: 'sections',
      title: 'Sections',
      type: 'array',
      description: 'Each section shows a heading beside its text, for example "Automation".',
      of: [
        defineArrayMember({
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
              description: 'Bold, italic and links only.',
              of: [paragraphsBlock],
              validation: (Rule) => Rule.required(),
            }),
          ],
          preview: {
            select: { title: 'heading' },
          },
        }),
      ],
    }),
  ],
  preview: {
    select: { title: 'title', slug: 'slug.current', lead: 'lead', intro: 'intro' },
    prepare({ title, slug, lead, intro }) {
      const text = blocksText(lead) || blocksText(intro)
      const words = text.split(' ').slice(0, 12).join(' ')

      return {
        title: title || words || 'Executive summary',
        subtitle: [slug ? `…/${slug}` : 'No slug', title && words ? words : null].filter(Boolean).join(' · '),
      }
    },
  },
})
