import { TagIcon } from '@sanity/icons/Tag'
import { defineField, defineType } from 'sanity'

/**
 * One award category, for example "Investment Offering (UK)".
 *
 * 1,168 of these come out of parsing `cyph_winners`. They are global, not
 * scoped to a programme: scoping them would turn 1,168 documents into 1,619
 * programme-plus-category pairs for no gain, and the same category name
 * recurs across programmes and years.
 *
 * A document rather than a row because template 07 is an award category page,
 * so a category needs its own address. A Winner has no such template and stays
 * a row on AwardsProgramme.
 */
export const awardCategory = defineType({
  name: 'awardCategory',
  title: 'Award category',
  type: 'document',
  icon: TagIcon,
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
      name: 'categoryGroup',
      title: 'Category group',
      type: 'string',
      description:
        'Heading the category most often appears under, for example "TECHNOLOGY CATEGORIES". Indicative only: the group is stored per winner, because it varies by programme.',
    }),
    defineField({
      name: 'description',
      title: 'Description',
      type: 'richText',
    }),
  ],
  preview: {
    select: { title: 'title', group: 'categoryGroup', slug: 'slug.current' },
    prepare({ title, group, slug }) {
      return {
        title: title || 'Untitled category',
        subtitle: group || (slug ? `/${slug}` : 'No group'),
      }
    },
  },
})
