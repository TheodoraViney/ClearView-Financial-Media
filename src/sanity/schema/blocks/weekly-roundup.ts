import { CalendarIcon } from '@sanity/icons/Calendar'
import { defineArrayMember, defineField, defineType } from 'sanity'

import { adminLabelField, headingField, headingText, linkField } from '../fields'
import { WEEKLY_ROUNDUP_POST_COUNT, postsOfPageBrand } from './shared'

import { AutoFillPicksInput } from '@/sanity/components/auto-fill-picks-input'

export { WEEKLY_ROUNDUP_POST_COUNT }


/**
 * The weekly edition card: a static title, summary and button typed by the editor, and an "In this edition" list of
 * four posts. Picks come first; the page query fills the empty places with the brand's latest posts. The edition
 * date is not a field: the site shows the last Friday (UK).
 */
export const weeklyRoundup = defineType({
  name: 'weeklyRoundup',
  title: 'Weekly roundup',
  type: 'object',
  icon: CalendarIcon,
  fields: [
    adminLabelField,
    headingField('heading', { title: 'Heading', defaultLevel: 'h2', initialText: 'Weekly Roundup', required: true }),
    defineField({
      name: 'label',
      title: 'Label',
      type: 'string',
      description: 'Shown above the title, before the edition date.',
      initialValue: 'Weekly edition',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      initialValue: 'The week’s key stories for wealth managers',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'summary',
      title: 'Summary',
      type: 'text',
      rows: 3,
      initialValue:
        'A summary of the most important news, analysis and people moves published on WealthBriefing this week.',
      validation: (Rule) => [
        Rule.required(),
        Rule.max(240).warning('Longer than 240 characters; the card will grow taller'),
      ],
    }),
    defineField({
      ...linkField({ name: 'button', title: 'Button', required: true, labelRequired: true }),
      initialValue: { kind: 'internal', label: 'View Weekly Roundup' },
    }),
    defineField({
      name: 'listLabel',
      title: 'List label',
      type: 'string',
      description: 'Shown above the numbered list of posts.',
      initialValue: 'In this edition',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'posts',
      title: 'Picks',
      type: 'array',
      // Lists what the site fills automatically right now, with Pin buttons.
      components: { input: AutoFillPicksInput },
      description: `Up to ${WEEKLY_ROUNDUP_POST_COUNT}, in display order. Empty places fill with the latest posts.`,
      of: [
        defineArrayMember({
          type: 'reference',
          to: [{ type: 'post' }],
          options: { filter: postsOfPageBrand, disableNew: true },
        }),
      ],
      validation: (Rule) => Rule.max(WEEKLY_ROUNDUP_POST_COUNT).unique(),
    }),
  ],
  preview: {
    select: { adminLabel: 'adminLabel', heading: 'heading', posts: 'posts' },
    prepare({ adminLabel, heading, posts }) {
      const count = Array.isArray(posts) ? posts.length : 0

      return {
        title: adminLabel || headingText(heading) || 'Weekly roundup',
        subtitle: `Weekly roundup · ${count} ${count === 1 ? 'pick' : 'picks'}, then latest`,
      }
    },
  },
})
