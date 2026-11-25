import { defineArrayMember, defineField, type ConditionalProperty } from 'sanity'

import { PageBlocksInput } from '@/sanity/components/page-blocks-input'

import { articleListing } from './article-listing'
import { awardsWinners } from './awards-winners'
import { benefitPanel } from './benefit-panel'
import { companyAwards } from './company-awards'
import { companyDirectory } from './company-directory'
import { companyEvents } from './company-events'
import { companyFilters } from './company-filters'
import { companySponsoredContent } from './company-sponsored-content'
import { contactForm } from './contact-form'
import { coverageList } from './coverage-list'
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
import { overlayHero } from './overlay-hero'
import { pageHero } from './page-hero'
import { postBriefs, postCards } from './post-list'
import { publications } from './publications'
import { recordFeature } from './record-feature'
import { recordListing } from './record-listing'
import { relatedTopics } from './related-topics'
import { splitLayout } from './split-layout'
import { sponsoredContent } from './sponsored-content'
import { statsBar } from './stats-bar'
import { subscribeBanner } from './subscribe-banner'
import { teamNetwork } from './team-network'
import { topPicks } from './top-picks'
import { topStories } from './top-stories'
import { weeklyRoundup } from './weekly-roundup'

// Every block type in the schema. Awards Winners and Most read go in a Two columns sidebar only, and Page heading, the
// awards, events and research list, the articles list and Related topics in its main column only (they bring the
// column's inset), so pages do not list them. The Company Engagement page's blocks go on that page only.
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
  contactForm,
  overlayHero,
  coverageList,
  recordFeature,
  teamNetwork,
  companyFilters,
  companyDirectory,
  companyAwards,
  companyEvents,
  companySponsoredContent,
]

const COLUMN_ONLY_BLOCK_TYPES: readonly (typeof blockTypes)[number][] = [
  awardsWinners,
  pageHero,
  recordListing,
  articleListing,
  relatedTopics,
  mostReadSidebar,
]

// Page heading also heads the Company Engagement page, which has no right column (PageBlocksInput offers it there only).
const pageBlockTypes = [...blockTypes.filter((blockType) => !COLUMN_ONLY_BLOCK_TYPES.includes(blockType)), pageHero]

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
    of: [
      imageHero.name,
      overlayHero.name,
      coverageList.name,
      numberedList.name,
      recordFeature.name,
      benefitPanel.name,
      teamNetwork.name,
      opportunityCards.name,
      enquiryForm.name,
      contactForm.name,
      cta.name,
    ],
  },
  {
    name: 'companies',
    title: 'Company Engagement page',
    of: [
      pageHero.name,
      companyFilters.name,
      companyDirectory.name,
      companyAwards.name,
      companyEvents.name,
      companySponsoredContent.name,
    ],
  },
  { name: 'other', title: 'Other', of: [publications.name, statsBar.name] },
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
    // Leaves out the blocks the page cannot use (ClearView-only ones, the Company Engagement page's) from the insert menus.
    components: { input: PageBlocksInput },
  })
