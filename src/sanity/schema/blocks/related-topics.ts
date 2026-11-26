import { TagsIcon } from '@sanity/icons/Tags'
import { defineArrayMember, defineField, defineType } from 'sanity'

import { isEditorialBrandKey } from '@/brands'

import { adminLabelField, headingField } from '../fields'

/**
 * "Explore related topics": the editor's categories and topics, in order, as links to the Categories page filtered by
 * each. The Categories page is on the editorial brands only, so the block is too. Goes in the main column of a Two
 * columns block.
 */
export const relatedTopics = defineType({
  name: 'relatedTopics',
  title: 'Related topics',
  type: 'object',
  icon: TagsIcon,
  validation: (Rule) =>
    Rule.custom((_value, context) =>
      isEditorialBrandKey(String((context.document as { brand?: string } | undefined)?.brand ?? ''))
        ? true
        : 'The topic links open the Categories page, which WealthBriefing, WealthBriefingAsia and Family Wealth Report have',
    ),
  fields: [
    adminLabelField,
    headingField('heading', { defaultLevel: 'h2', initialText: 'Explore related topics', required: true }),
    defineField({
      name: 'items',
      title: 'Categories and topics',
      type: 'array',
      description: 'Each links to the Categories page filtered by it.',
      of: [
        defineArrayMember({
          type: 'reference',
          to: [{ type: 'category' }, { type: 'topic' }],
          options: { disableNew: true },
        }),
      ],
      validation: (Rule) => Rule.required().min(1).error('Add at least one category or topic').unique(),
    }),
  ],
  preview: {
    select: { adminLabel: 'adminLabel', heading: 'heading', items: 'items' },
    prepare({ adminLabel, heading, items }) {
      const text = Array.isArray(heading) ? heading[0]?.children?.[0]?.text : undefined
      const count = Array.isArray(items) ? items.length : 0

      return { title: adminLabel || text || 'Related topics', subtitle: `Related topics · ${count}`, media: TagsIcon }
    },
  },
})
