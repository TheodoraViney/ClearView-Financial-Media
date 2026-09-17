import { BookmarkIcon } from '@sanity/icons/Bookmark'
import { defineField, defineType } from 'sanity'

import { altField } from '../fields'

/**
 * An evergreen awards programme, for example "WealthBriefingAsia Greater China
 * Awards". Each yearly edition is an AwardsProgramme pointing back here.
 *
 * Source: the `awards_event_programme` taxonomy. 13 terms carry events in the
 * export; the taxonomy holds 16 and mixes evergreen programmes with
 * year-specific siblings, so the loader keeps only the evergreen ones.
 *
 * A document rather than a field because the term has a public URL.
 * Publication is NOT stored here: the term name carries the brand, but on
 * shared records a publication tag is attribution for listings, never an
 * access filter. See README section 3 and MIGRATION-CONTEXT section 5.
 */
export const awardsProgrammeGroup = defineType({
  name: 'awardsProgrammeGroup',
  title: 'Awards programme',
  type: 'document',
  icon: BookmarkIcon,
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
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'description',
      title: 'Description',
      type: 'richText',
    }),
    defineField({
      name: 'logo',
      title: 'Logo',
      type: 'image',
      options: { hotspot: true },
      fields: [altField],
    }),
    defineField({
      name: 'legacyTermId',
      title: 'Legacy taxonomy term ID',
      type: 'number',
      readOnly: true,
      description:
        'Term id in `awards_event_programme` on clearviewpublishing.com. Set by the migration, do not edit.',
    }),
  ],
  preview: {
    select: { title: 'title', slug: 'slug.current', media: 'logo' },
    prepare({ title, slug, media }) {
      return {
        title: title || 'Untitled programme',
        subtitle: slug ? `/${slug}` : 'No slug',
        media,
      }
    },
  },
})
