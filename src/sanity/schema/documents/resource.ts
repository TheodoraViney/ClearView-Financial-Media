import { DocumentPdfIcon } from '@sanity/icons/DocumentPdf'
import { defineArrayMember, defineField, defineType } from 'sanity'

import { altField, legacyWpIdField } from '../fields'

/**
 * A downloadable research report or post-forum report. 12 records.
 *
 * URLs are preserved: /resource/{slug}/ stays as it is, and
 * /resource-categories/research/ is a live listing with its own title and
 * canonical, so `category` has to survive the migration.
 *
 * Three source fields are empty on all 12 records and are not carried over:
 * `make_author_company`, `cyph_author_company` and `resource_running_time`.
 *
 * `download_thumbnail` is one ACF image field in WordPress but holds two kinds of
 * attachment: 6 of the 12 records point at a real image, the other 6 at the report
 * PDF itself (`FWRCybersecurityForumReport2026.pdf` and five more). An `image`
 * field cannot hold a PDF, so the two are split here and the migration routes each
 * attachment by its MIME type.
 */
export const resource = defineType({
  name: 'resource',
  title: 'Resource',
  type: 'document',
  icon: DocumentPdfIcon,
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: { source: 'title', maxLength: 96 },
      description: 'Published at /resource/{slug}/. Migrated from WordPress, changing it breaks a live URL.',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'category',
      title: 'Category',
      type: 'string',
      options: {
        list: [{ title: 'Research', value: 'research' }],
      },
      description:
        'Drives /resource-categories/{category}/. Only "research" has a live listing in the URL baseline; extend the list once the client confirms the rest of the taxonomy.',
    }),
    defineField({
      name: 'body',
      title: 'Body',
      type: 'richText',
    }),
    defineField({
      name: 'downloadThumbnail',
      title: 'Download thumbnail',
      type: 'image',
      options: { hotspot: true },
      fields: [altField],
    }),
    defineField({
      name: 'downloadFile',
      title: 'Download file',
      type: 'file',
      description:
        'The report itself, where the source attached a PDF rather than a cover image. Half the migrated records arrive this way.',
    }),
    defineField({
      name: 'downloadUrl',
      title: 'Download URL or form',
      type: 'url',
      description: 'Jotform address on every current record. Native registration forms are out of scope.',
      validation: (Rule) => Rule.uri({ scheme: ['http', 'https'] }),
    }),
    defineField({
      name: 'authors',
      title: 'Participants and authors',
      type: 'array',
      of: [defineArrayMember({ type: 'reference', to: [{ type: 'person' }] })],
      validation: (Rule) => Rule.unique(),
    }),
    defineField({
      name: 'partnerCategories',
      title: 'Partners',
      type: 'array',
      of: [defineArrayMember({ type: 'companyGroup' })],
    }),
    legacyWpIdField,
  ],
  preview: {
    select: {
      title: 'title',
      category: 'category',
      slug: 'slug.current',
      media: 'downloadThumbnail',
    },
    prepare({ title, category, slug, media }) {
      return {
        title: title || 'Untitled resource',
        subtitle: category || (slug ? `/resource/${slug}` : 'No category'),
        media,
      }
    },
  },
})
