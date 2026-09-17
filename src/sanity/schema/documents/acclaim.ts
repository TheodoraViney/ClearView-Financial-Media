import { BookIcon } from '@sanity/icons/Book'
import { defineField, defineType } from 'sanity'

import { altField, legacyWpIdField } from '../fields'

/**
 * An Acclaim magazine, embedded from Issuu. 8 records.
 *
 * URLs are preserved: /acclaim/{slug}/ stays exactly as it is on
 * clearviewpublishing.com, so the slug migrates unchanged and must not be
 * regenerated from the title.
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
      description: 'Published at /acclaim/{slug}/. Migrated from WordPress, changing it breaks a live URL.',
      validation: (Rule) => Rule.required(),
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
      description: 'The 32-character document hash, for example c2007338474b6528a1bc9d7614c33cfb.',
      validation: (Rule) =>
        Rule.regex(/^[0-9a-f]{32}$/, { name: 'Issuu document hash', invert: false }),
    }),
    defineField({
      name: 'embedCode',
      title: 'Issuu embed code',
      type: 'text',
      rows: 6,
      description:
        'Raw iframe as published by Issuu. Rendered as-is, so paste only what Issuu produced. Prefer the Issuu ID above where the front end can build the embed itself.',
    }),
    legacyWpIdField,
  ],
  preview: {
    select: { title: 'title', programme: 'programme.title', media: 'thumbnailImage' },
    prepare({ title, programme, media }) {
      return {
        title: title || 'Untitled acclaim',
        subtitle: programme || 'No programme',
        media,
      }
    },
  },
})
