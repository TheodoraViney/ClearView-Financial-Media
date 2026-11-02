import { ThLargeIcon } from '@sanity/icons/ThLarge'
import { defineArrayMember, defineField, defineType } from 'sanity'

import { adminLabelField, headingText } from '../fields'

/** The design draws four destination cards. */
export const EXPLORE_GRID_CARD_MAX = 4

/**
 * The "Explore {publication}" destination cards: up to four cards in a grid, each with its own source. The section
 * has no visible heading; its accessible name comes from the brand title in code.
 */
export const exploreGrid = defineType({
  name: 'exploreGrid',
  title: 'Explore cards',
  type: 'object',
  icon: ThLargeIcon,
  fields: [
    adminLabelField,
    defineField({
      name: 'cards',
      title: 'Cards',
      type: 'array',
      description: `1 to ${EXPLORE_GRID_CARD_MAX} cards, in display order.`,
      of: [defineArrayMember({ type: 'exploreCard' })],
      validation: (Rule) => Rule.required().min(1).max(EXPLORE_GRID_CARD_MAX),
    }),
  ],
  preview: {
    select: { adminLabel: 'adminLabel', cards: 'cards' },
    prepare({ adminLabel, cards }) {
      const list = Array.isArray(cards) ? (cards as { heading?: unknown }[]) : []
      const headings = list.map((card) => headingText(card.heading) ?? 'Untitled').join(', ')

      return {
        title: adminLabel || 'Explore cards',
        subtitle: `${list.length} ${list.length === 1 ? 'card' : 'cards'}${headings ? `: ${headings}` : ''}`,
      }
    },
  },
})
