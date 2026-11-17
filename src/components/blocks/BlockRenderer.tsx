import type { BrandKey } from '@/brands'
import type { AdUnits } from '@/lib/gam'
import type { RecordListingContext } from '@/sanity/shared-listings-view'

import { AwardsWinners } from './AwardsWinners'
import { Cta } from './Cta'
import { ExploreGrid } from './ExploreGrid'
import { FeaturedStories } from './FeaturedStories'
import { Highlights } from './Highlights'
import { NewsletterSignup } from './NewsletterSignup'
import { PageHero } from './PageHero'
import { PostBriefs } from './PostBriefs'
import { PostCards } from './PostCards'
import { Publications } from './Publications'
import { RecordListing } from './RecordListing'
import { SplitLayout } from './SplitLayout'
import { SponsoredContent } from './SponsoredContent'
import { StatsBar } from './StatsBar'
import { SubscribeBanner } from './SubscribeBanner'
import { TopPicks } from './TopPicks'
import { TopStories } from './TopStories'
import { WeeklyRoundup } from './WeeklyRoundup'
import type { PageBlock } from './types'

/**
 * `today` is the UK date the page query ran with (`$today`), for date-dependent lines such as the awards meta.
 * `now` is the hourly-cached ISO time that server-rendered relative dates ("2 hours ago") count from.
 * `ads` are the brand's units for the page type, for the blocks that carry a banner of their own (Awards Winners).
 * `listing` is the shared listings route's tab, URL and records; a record listing block renders nothing without it.
 */
export function BlockRenderer({
  blocks,
  brand,
  today,
  now,
  ads,
  listing,
}: {
  blocks: PageBlock[] | null | undefined
  brand: BrandKey
  today: string
  now: string
  ads: AdUnits
  listing?: RecordListingContext
}) {
  if (!blocks?.length) {
    return null
  }

  return (
    <>
      {blocks.map((block) => (
        <Block key={block._key} block={block} brand={brand} today={today} now={now} ads={ads} listing={listing} />
      ))}
    </>
  )
}

function Block({
  block,
  brand,
  today,
  now,
  ads,
  listing,
}: {
  block: PageBlock
  brand: BrandKey
  today: string
  now: string
  ads: AdUnits
  listing?: RecordListingContext
}) {
  switch (block._type) {
    case 'cta':
      return <Cta block={block} brand={brand} />
    case 'topStories':
      return <TopStories block={block} brand={brand} />
    case 'sponsoredContent':
      return <SponsoredContent block={block} brand={brand} />
    case 'publications':
      return <Publications block={block} brand={brand} unit={ads.publications} />
    case 'highlights':
      return <Highlights block={block} brand={brand} today={today} />
    case 'splitLayout':
      return (
        <SplitLayout
          block={block}
          brand={brand}
          renderBlocks={(blocks) => (
            <BlockRenderer blocks={blocks} brand={brand} today={today} now={now} ads={ads} listing={listing} />
          )}
        />
      )
    case 'featuredStories':
      return <FeaturedStories block={block} brand={brand} now={now} />
    case 'statsBar':
      return <StatsBar block={block} brand={brand} />
    case 'newsletterSignup':
      return <NewsletterSignup block={block} brand={brand} />
    // Publication home blocks (WB / WBA / FWR).
    case 'postCards':
      return <PostCards block={block} brand={brand} />
    case 'postBriefs':
      return <PostBriefs block={block} brand={brand} />
    case 'weeklyRoundup':
      return <WeeklyRoundup block={block} brand={brand} today={today} />
    case 'topPicks':
      return <TopPicks block={block} brand={brand} />
    case 'exploreGrid':
      return <ExploreGrid block={block} brand={brand} today={today} />
    case 'subscribeBanner':
      return <SubscribeBanner block={block} brand={brand} />
    // Main column only.
    case 'pageHero':
      return <PageHero block={block} brand={brand} />
    case 'recordListing':
      return listing ? <RecordListing block={block} brand={brand} listing={listing} /> : null
    // Sidebar only.
    case 'awardsWinners':
      return <AwardsWinners block={block} brand={brand} unit={ads.awardsWinners} />
    default:
      return unknownBlock(block)
  }
}

// Typed `never`: adding a block to the page query without a case here fails the typecheck.
function unknownBlock(block: never): null {
  if (process.env.NODE_ENV !== 'production') {
    console.warn(`BlockRenderer: no component for block type "${(block as { _type?: string })._type}"`)
  }

  return null
}
