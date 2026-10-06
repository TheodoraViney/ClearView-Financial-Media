import { ThListIcon } from '@sanity/icons/ThList'
import { defineArrayMember, defineField, defineType } from 'sanity'

import { adminLabelField, headingField, headingText, linkField } from '../fields'
import { postsOfPageBrand } from './top-stories'

export const FEATURED_STORIES_POST_COUNT = 4

/** Heading, a "View all" link and exactly four hand-picked posts. No auto-fill. */
export const featuredStories = defineType({
  name: 'featuredStories',
  title: 'Featured stories',
  type: 'object',
  icon: ThListIcon,
  fields: [
    adminLabelField,
    headingField('heading', { title: 'Heading', defaultLevel: 'h2', required: true }),
    linkField({ required: true, labelRequired: true }),
    defineField({
      name: 'posts',
      title: 'Posts',
      type: 'array',
      description: 'Exactly four posts, in display order.',
      of: [
        defineArrayMember({
          type: 'reference',
          to: [{ type: 'post' }],
          options: { filter: postsOfPageBrand, disableNew: true },
        }),
      ],
      validation: (Rule) =>
        Rule.required().min(FEATURED_STORIES_POST_COUNT).max(FEATURED_STORIES_POST_COUNT).unique(),
    }),
  ],
  preview: {
    select: { adminLabel: 'adminLabel', heading: 'heading', posts: 'posts' },
    prepare({ adminLabel, heading, posts }) {
      const count = Array.isArray(posts) ? posts.length : 0

      return {
        title: adminLabel || headingText(heading) || 'Featured stories',
        subtitle: `${count} ${count === 1 ? 'post' : 'posts'}`,
      }
    },
  },
})
