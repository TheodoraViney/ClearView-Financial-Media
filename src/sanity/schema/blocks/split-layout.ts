import { SplitVerticalIcon } from '@sanity/icons/SplitVertical'
import { defineArrayMember, defineField, defineType } from 'sanity'

import { adminLabelField } from '../fields'
import { adSlot } from './ad-slot'
import { cta } from './cta'
import { highlights } from './highlights'
import { publications } from './publications'
import { topStories } from './top-stories'

// Blocks allowed in the main column.
// splitLayout itself is never listed, so the layout cannot nest.
const mainBlockTypes = [adSlot, topStories, publications, cta]

// Blocks allowed in the sidebar.
const asideBlockTypes = [highlights, adSlot]

/**
 * A main column with a sidebar beside it from 1280px. Below that the sidebar
 * stacks after the main column.
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
    }),
    defineField({
      name: 'aside',
      title: 'Sidebar',
      type: 'array',
      of: asideBlockTypes.map((blockType) => defineArrayMember({ type: blockType.name })),
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
