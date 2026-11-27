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
 *
 * The page copy (description, eligibility, recognition, judging) is plain text on the category, so it is the same on
 * every programme's page for it.
 */
// Categories are shared: "Overall Private Bank" is awarded by both the Channel Islands and the MENA programmes.
// Description sits under the title on the category page; the other three under Category details.
const SHARED_COPY =
  'Shows on the page of every programme that awards this category; a programme that needs its own wording needs its own category.'

export const awardCategory = defineType({
  name: 'awardCategory',
  title: 'Award category',
  type: 'document',
  icon: TagIcon,
  fieldsets: [{ name: 'copy', title: 'Category page', description: SHARED_COPY }],
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
      description: 'Changing it changes the page address.',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'categoryGroup',
      title: 'Category group',
      type: 'string',
      // The heading the category most often appears under, for example "TECHNOLOGY CATEGORIES".
      description: "Shown only when the latest edition's winners have no group of their own.",
    }),
    defineField({
      name: 'description',
      title: 'Description',
      type: 'text',
      rows: 3,
      fieldset: 'copy',
      validation: (Rule) => Rule.max(400).warning('Longer than 400 characters; one short paragraph reads best'),
    }),
    defineField({
      name: 'eligibility',
      title: 'Eligibility',
      type: 'text',
      rows: 3,
      fieldset: 'copy',
      validation: (Rule) => Rule.max(400).warning('Longer than 400 characters; keep it to a sentence or two'),
    }),
    defineField({
      name: 'recognises',
      title: 'What the category recognises',
      type: 'text',
      rows: 3,
      fieldset: 'copy',
      validation: (Rule) => Rule.max(400).warning('Longer than 400 characters; keep it to a sentence or two'),
    }),
    defineField({
      name: 'judging',
      title: 'Judging context',
      type: 'text',
      rows: 3,
      fieldset: 'copy',
      validation: (Rule) => Rule.max(400).warning('Longer than 400 characters; keep it to a sentence or two'),
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
