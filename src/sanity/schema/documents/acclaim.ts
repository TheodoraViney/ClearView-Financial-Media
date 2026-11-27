import { BookIcon } from '@sanity/icons/Book'
import { defineField, defineType } from 'sanity'

import { altField, legacyWpIdField } from '../fields'

/**
 * An Acclaim magazine. 8 records, migrated from WordPress.
 *
 * The site has no Acclaim page: an awards edition links to its magazine through
 * `awardsProgramme.acclaim`, and the link opens `link` in a new tab
 * (`acclaimHref`). Any address works: the Issuu reader, a PDF, another page.
 *
 * Studio shows Title, Link and Awards programme. The rest is WordPress data the site does not read, kept but hidden:
 * the slug (kept for the legacy `/acclaim/{slug}/` redirects, so not required on new records), the thumbnail, the
 * Issuu id and embed code, and the legacy id. `programme` is not read by the site either; it tells editors which
 * programme a magazine belongs to.
 */
export const acclaim = defineType({
  name: 'acclaim',
  title: 'Acclaim',
  type: 'document',
  icon: BookIcon,
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
      hidden: true,
    }),
    defineField({
      name: 'link',
      title: 'Link',
      type: 'url',
      description: 'Opened in a new tab from the awards page: Issuu, a PDF or any page.',
      validation: (Rule) => Rule.required().uri({ scheme: ['https'] }),
    }),
    defineField({
      name: 'programme',
      title: 'Awards programme',
      type: 'reference',
      to: [{ type: 'awardsProgrammeGroup' }],
    }),
    defineField({
      name: 'thumbnailImage',
      title: 'Thumbnail image',
      type: 'image',
      options: { hotspot: true },
      fields: [altField],
      hidden: true,
    }),
    defineField({
      name: 'issuuId',
      title: 'Issuu ID',
      type: 'string',
      hidden: true,
      validation: (Rule) =>
        Rule.regex(/^[0-9a-f]{32}$/, { name: 'Issuu document hash', invert: false }),
    }),
    defineField({
      name: 'embedCode',
      title: 'Issuu embed code',
      type: 'text',
      rows: 6,
      hidden: true,
    }),
    { ...legacyWpIdField, hidden: true },
  ],
  preview: {
    select: { title: 'title', link: 'link', media: 'thumbnailImage' },
    prepare({ title, link, media }) {
      return {
        title: title || 'Untitled acclaim',
        subtitle: link || 'No link',
        media,
      }
    },
  },
})
