import { defineArrayMember, defineField } from 'sanity'

import { adSlot } from './ad-slot'
import { cta } from './cta'
import { exploreGrid } from './explore-grid'
import { featuredStories } from './featured-stories'
import { highlights } from './highlights'
import { newsletterSignup } from './newsletter-signup'
import { postBriefs, postCards } from './post-list'
import { publications } from './publications'
import { splitLayout } from './split-layout'
import { sponsoredContent } from './sponsored-content'
import { statsBar } from './stats-bar'
import { subscribeBanner } from './subscribe-banner'
import { topPicks } from './top-picks'
import { topStories } from './top-stories'
import { weeklyRoundup } from './weekly-roundup'

export const blockTypes = [
  cta,
  adSlot,
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
]

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
  { name: 'ads', title: 'Ads', of: [adSlot.name] },
  { name: 'signup', title: 'Signup', of: [subscribeBanner.name, newsletterSignup.name] },
  { name: 'other', title: 'Other', of: [publications.name, statsBar.name, cta.name] },
]

export const blocksField = defineField({
  name: 'blocks',
  title: 'Blocks',
  type: 'array',
  of: blockTypes.map((blockType) => defineArrayMember({ type: blockType.name })),
  options: { insertMenu: { groups: INSERT_MENU_GROUPS, views: [{ name: 'list' }] } },
})
