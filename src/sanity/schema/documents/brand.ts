import { defineField, defineType, type ValidationContext } from 'sanity'

import { brandDocumentId, EDITORIAL_BRAND_KEYS } from '@/brands'
import { NEWSLETTER_COPY_DEFAULTS, NEWSLETTER_TITLE_PLACEHOLDER } from '@/lib/newsletter-copy'
import { BrandColorsInput } from '@/sanity/components/brand-colors-input'

import { brevoSenderField } from '../fields'

// Only the three publications send a newsletter; ClearView's brand document has no Newsletter tab.
// Matched on the fixed document id (the draft id carries a `drafts.` prefix).
const EDITORIAL_BRAND_IDS: string[] = EDITORIAL_BRAND_KEYS.map(brandDocumentId)
const hasNewsletter = (id: string | undefined) => EDITORIAL_BRAND_IDS.includes((id ?? '').replace(/^drafts\./, ''))

// Required on the three publications only: a plain Rule.required() would also block ClearView, where the tab is hidden.
const requiredForNewsletter = (message: string) => (value: unknown, context: ValidationContext) =>
  value || !hasNewsletter(context.document?._id) ? true : message

const emailCopy = (name: keyof typeof NEWSLETTER_COPY_DEFAULTS, title: string, description: string) =>
  defineField({
    name,
    title,
    type: 'string',
    description,
    initialValue: NEWSLETTER_COPY_DEFAULTS[name],
  })

export const brand = defineType({
  name: 'brand',
  title: 'Brand',
  type: 'document',
  groups: [
    { name: 'brand', title: 'Brand', default: true },
    { name: 'newsletter', title: 'Newsletter', hidden: ({ document }) => !hasNewsletter(document?._id) },
  ],
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      group: 'brand',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'key',
      title: 'Key',
      type: 'slug',
      group: 'brand',
      readOnly: ({ document }) => Boolean(document?._createdAt),
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'domain',
      title: 'Domain',
      type: 'string',
      group: 'brand',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'region',
      title: 'Region',
      type: 'string',
      group: 'brand',
      options: {
        list: [
          { title: 'UK', value: 'uk' },
          { title: 'Asia', value: 'asia' },
          { title: 'US', value: 'us' },
          { title: 'Global', value: 'global' },
        ],
      },
    }),
    defineField({
      name: 'logo',
      title: 'Logo',
      type: 'image',
      group: 'brand',
      description: 'SVG. Screen readers read the image\'s alt text from Media, or the brand title when it is empty.',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'footerLogo',
      title: 'Footer logo',
      type: 'image',
      group: 'brand',
      description: 'SVG. Only when the footer shows a different lockup from the header; empty uses the Logo above.',
    }),
    // Display only: the input shows BRANDS[key].colors from src/brands.ts and never writes, so this stays empty.
    defineField({
      name: 'brandColors',
      title: 'Brand colours',
      type: 'string',
      group: 'brand',
      description: 'Set in code to match the design.',
      readOnly: true,
      components: { input: BrandColorsInput },
    }),
    defineField({
      name: 'newsletter',
      title: 'Newsletter',
      type: 'object',
      group: 'newsletter',
      hidden: ({ document }) => !hasNewsletter(document?._id),
      fields: [
        brevoSenderField('sender', {
          title: 'Sender',
          description:
            'Who the newsletter comes from: the name and address readers see. Only active senders in Brevo → Senders appear.',
          requiredWhen: ({ document }) => hasNewsletter(document?._id),
        }),
        defineField({
          name: 'articlesPerIssue',
          title: 'Articles per issue',
          type: 'number',
          description:
            'How many of the latest articles a new issue starts with.',
          initialValue: 4,
          validation: (Rule) =>
            Rule.integer().min(1).max(20).custom(requiredForNewsletter('Required to start a newsletter issue')),
        }),
        defineField({
          name: 'copy',
          title: 'Email copy',
          type: 'object',
          description: 'Labels and footer text of every newsletter email. An empty field hides its element.',
          options: { collapsible: true, collapsed: true },
          fields: [
            emailCopy('featuredLabel', 'Featured label', 'Small label above the first article. Leave empty to hide it.'),
            emailCopy('readFullStory', 'Read full story button', 'Button under the first article. Leave empty to hide it.'),
            emailCopy(
              'readMore',
              'Read more link',
              'Link under every other article. Leave empty to hide it; the headline still links to the article.',
            ),
            emailCopy('advertisementLabel', 'Advertisement label', 'Shown above each banner. Leave empty to hide it.'),
            emailCopy(
              'footerText',
              'Footer text',
              `Why the reader gets this email. ${NEWSLETTER_TITLE_PLACEHOLDER} is replaced with the publication title. Leave empty to hide it.`,
            ),
            emailCopy(
              'unsubscribe',
              'Unsubscribe link',
              `Text of the unsubscribe link in the footer. Every email carries this link; left empty, it reads "${NEWSLETTER_COPY_DEFAULTS.unsubscribe}".`,
            ),
          ],
        }),
      ],
    }),
  ],
})
