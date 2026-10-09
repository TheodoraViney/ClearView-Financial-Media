import { defineField, defineType } from 'sanity'

import { brandDocumentId, EDITORIAL_BRAND_KEYS } from '@/brands'

// Only the three publications send a newsletter; ClearView's brand document has no Newsletter tab.
// Matched on the fixed document id (the draft id carries a `drafts.` prefix).
const EDITORIAL_BRAND_IDS: string[] = EDITORIAL_BRAND_KEYS.map(brandDocumentId)
const hasNewsletter = (id: string | undefined) => EDITORIAL_BRAND_IDS.includes((id ?? '').replace(/^drafts\./, ''))

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
      description: 'SVG. The site uses the brand title as its accessible name.',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'brandColor',
      title: 'Brand color',
      type: 'string',
      group: 'brand',
      validation: (Rule) =>
        Rule.regex(/^#[0-9a-fA-F]{6}$/, {
          name: 'hex color',
          invert: false,
        }),
    }),
    defineField({
      name: 'newsletter',
      title: 'Newsletter',
      type: 'object',
      group: 'newsletter',
      hidden: ({ document }) => !hasNewsletter(document?._id),
      fields: [
        defineField({
          name: 'brevoListId',
          title: 'Brevo list id',
          type: 'number',
          description:
            "Brevo list id — the list subscribers of this publication's daily newsletter are added to. Brevo → Contacts → Lists.",
          validation: (Rule) => Rule.integer().positive(),
        }),
        defineField({
          name: 'confirmationTemplateId',
          title: 'Confirmation template id',
          type: 'number',
          description:
            "Brevo template id of the 'Confirm your subscription' email. The template must contain {{ doubleoptin }} and carry the optin tag.",
          validation: (Rule) => Rule.integer().positive(),
        }),
      ],
    }),
  ],
})
