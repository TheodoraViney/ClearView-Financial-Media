import { SplitVerticalIcon } from '@sanity/icons/SplitVertical'
import { defineArrayMember, defineField, defineType } from 'sanity'

import { adminLabelField } from '../fields'
import { awardsWinners } from './awards-winners'
import { cta } from './cta'
import { highlights } from './highlights'
import { postBriefs, postCards } from './post-list'
import { publications } from './publications'
import { sponsoredContent } from './sponsored-content'
import { topStories } from './top-stories'
import { weeklyRoundup } from './weekly-roundup'

// Blocks allowed in the main column.
// splitLayout itself is never listed, so the layout cannot nest.
const mainBlockTypes = [topStories, sponsoredContent, postCards, postBriefs, weeklyRoundup, publications, cta]

// Blocks allowed in the sidebar.
const asideBlockTypes = [highlights, awardsWinners]

/**
 * A main column with a sidebar beside it from 1280px. Below that the sidebar
 * stacks after the main column. As a page's first block it also carries the
 * page's Top banner (head of the main column) and Side banner (head of the
 * sidebar), placed by the page template.
 */
export const splitLayout = defineType({
  name: 'splitLayout',
  title: 'Two columns',
  type: 'object',
  icon: SplitVerticalIcon,
  fields: [
    adminLabelField,
    defineField({
      name: 'main',
      title: 'Main column',
      type: 'array',
      of: mainBlockTypes.map((blockType) => defineArrayMember({ type: blockType.name })),
      validation: (Rule) => Rule.required().min(1).error('Add at least one block to the main column'),
    }),
    defineField({
      name: 'aside',
      title: 'Sidebar',
      type: 'array',
      of: asideBlockTypes.map((blockType) => defineArrayMember({ type: blockType.name })),
      validation: (Rule) => Rule.required().min(1).error('Add at least one block to the sidebar'),
    }),
  ],
  preview: {
    select: { adminLabel: 'adminLabel', main: 'main', aside: 'aside' },
    prepare({ adminLabel, main, aside }) {
      const count = (blocks: unknown) => (Array.isArray(blocks) ? blocks.length : 0)

      return {
        title: adminLabel || 'Two columns',
        subtitle: `Main: ${count(main)} · Sidebar: ${count(aside)}`,
      }
    },
  },
})
