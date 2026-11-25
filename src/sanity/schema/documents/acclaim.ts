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
 * `programme`, `thumbnailImage`, `issuuId` and `embedCode` are WordPress data the
 * site does not read. The slug is kept for the legacy `/acclaim/{slug}/` redirects.
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
      description:
        'The old clearviewpublishing.com address /acclaim/{slug}/, kept to redirect it. The new site has no Acclaim page.',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'link',
      title: 'Link',
      type: 'url',
      description:
        'Where "Annual Acclaim magazine" on the awards page goes, opened in a new tab: the magazine on Issuu, a PDF or any other page. Paste the full address, starting with https://.',
      validation: (Rule) => Rule.required().uri({ scheme: ['https'] }),
    }),
    defineField({
      name: 'programme',
      title: 'Awards programme',
      type: 'reference',
      to: [{ type: 'awardsProgrammeGroup' }],
      description: 'From the `acclaim---awards-programme` taxonomy. 7 of 8 records carry a term.',
    }),
    defineField({
      name: 'thumbnailImage',
      title: 'Thumbnail image',
      type: 'image',
      options: { hotspot: true },
      fields: [altField],
    }),
    defineField({
      name: 'issuuId',
      title: 'Issuu ID',
      type: 'string',
      description:
        'The 32-character document hash, for example c2007338474b6528a1bc9d7614c33cfb. From WordPress, not used on the site: the awards page uses Link.',
      validation: (Rule) =>
        Rule.regex(/^[0-9a-f]{32}$/, { name: 'Issuu document hash', invert: false }),
    }),
    defineField({
      name: 'embedCode',
      title: 'Issuu embed code',
      type: 'text',
      rows: 6,
      description:
        'Raw iframe as published by Issuu. From WordPress, not used on the site: the awards page uses Link.',
    }),
    legacyWpIdField,
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
