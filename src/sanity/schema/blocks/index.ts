import { defineArrayMember, defineField, type ConditionalProperty } from 'sanity'

import { PageBlocksInput } from '@/sanity/components/page-blocks-input'

import { articleListing } from './article-listing'
import { awardsWinners } from './awards-winners'
import { benefitPanel } from './benefit-panel'
import { cta } from './cta'
import { enquiryForm } from './enquiry-form'
import { exploreGrid } from './explore-grid'
import { featuredStories } from './featured-stories'
import { highlights } from './highlights'
import { mostReadSidebar } from './most-read-sidebar'
import { imageHero } from './image-hero'
import { newsletterSignup } from './newsletter-signup'
import { numberedList } from './numbered-list'
import { opportunityCards } from './opportunity-cards'
import { pageHero } from './page-hero'
import { postBriefs, postCards } from './post-list'
import { publications } from './publications'
import { recordListing } from './record-listing'
import { relatedTopics } from './related-topics'
import { splitLayout } from './split-layout'
import { sponsoredContent } from './sponsored-content'
import { statsBar } from './stats-bar'
import { subscribeBanner } from './subscribe-banner'
import { topPicks } from './top-picks'
import { topStories } from './top-stories'
import { weeklyRoundup } from './weekly-roundup'

// Every block type in the schema. Awards Winners and Most read go in a Two columns sidebar only, and Page heading, the
// awards, events and research list, the articles list and Related topics in its main column only (they bring the
// column's inset), so pages do not list them.
export const blockTypes = [
  cta,
  splitLayout,
  topStories,
  publications,
  highlights,
  featuredStories,
  statsBar,
  newsletterSignup,
  sponsoredContent,
  postCards,
  postBriefs,
  weeklyRoundup,
  topPicks,
  exploreGrid,
  subscribeBanner,
  awardsWinners,
  pageHero,
  recordListing,
  articleListing,
  relatedTopics,
  mostReadSidebar,
  imageHero,
  numberedList,
  benefitPanel,
  opportunityCards,
  enquiryForm,
]

const COLUMN_ONLY_BLOCK_TYPES: readonly (typeof blockTypes)[number][] = [
  awardsWinners,
  pageHero,
  recordListing,
  articleListing,
  relatedTopics,
  mostReadSidebar,
]

const pageBlockTypes = blockTypes.filter((blockType) => !COLUMN_ONLY_BLOCK_TYPES.includes(blockType))

// The page's "Add item" menu, grouped; inside each group the blocks follow their usual order on a page.
const INSERT_MENU_GROUPS = [
  { name: 'layout', title: 'Layout', of: [splitLayout.name] },
  {
    name: 'stories',
    title: 'Stories',
    of: [
      topStories.name,
      sponsoredContent.name,
      postCards.name,
      postBriefs.name,
      weeklyRoundup.name,
      topPicks.name,
      featuredStories.name,
    ],
  },
  { name: 'records', title: 'Group records', of: [highlights.name, exploreGrid.name] },
  { name: 'signup', title: 'Signup', of: [subscribeBanner.name, newsletterSignup.name] },
  {
    name: 'landing',
    title: 'Landing page',
    of: [imageHero.name, numberedList.name, benefitPanel.name, opportunityCards.name, enquiryForm.name],
  },
  { name: 'other', title: 'Other', of: [publications.name, statsBar.name, cta.name] },
]

/** A list of page blocks. The page document has one, and the home page two more between its fixed banners. */
export const pageBlocksField = (
  name: string,
  { title, description, hidden }: { title: string; description?: string; hidden?: ConditionalProperty },
) =>
  defineField({
    name,
    title,
    description,
    hidden,
    type: 'array',
    of: pageBlockTypes.map((blockType) => defineArrayMember({ type: blockType.name })),
    options: { insertMenu: { groups: INSERT_MENU_GROUPS, views: [{ name: 'list' }] } },
    // Leaves out the blocks the page brand cannot use (ClearView-only ones) from the insert menus.
    components: { input: PageBlocksInput },
  })
