import { SplitVerticalIcon } from '@sanity/icons/SplitVertical'
import { defineArrayMember, defineField, defineType } from 'sanity'

import { adminLabelField } from '../fields'
import { articleListing } from './article-listing'
import { awardsWinners } from './awards-winners'
import { cta } from './cta'
import { highlights } from './highlights'
import { mostReadSidebar } from './most-read-sidebar'
import { pageHero } from './page-hero'
import { postBriefs, postCards } from './post-list'
import { publications } from './publications'
import { recordListing } from './record-listing'
import { relatedTopics } from './related-topics'
import { sponsoredContent } from './sponsored-content'
import { topStories } from './top-stories'
import { weeklyRoundup } from './weekly-roundup'

// Blocks allowed in the main column.
// splitLayout itself is never listed, so the layout cannot nest.
const mainBlockTypes = [
  pageHero,
  topStories,
  sponsoredContent,
  postCards,
  postBriefs,
  weeklyRoundup,
  publications,
  recordListing,
  articleListing,
  relatedTopics,
  cta,
]

// Blocks allowed in the sidebar.
const asideBlockTypes = [highlights, awardsWinners, mostReadSidebar]

/**
 * A main column with a sidebar beside it from 1200px. Below that the sidebar
 * stacks after the main column. As a page's first block it also carries the
 * page's Top banner (head of the main column) and Side banner (head of the
 * sidebar), placed by the page template; there the sidebar may hold no block
 * and shows the Side banner alone (the shared listings page).
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
      // Further down the page an empty sidebar is left out and the main column takes the full width.
      description: "As the page's first block, the sidebar starts with the Side banner, even when empty.",
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
