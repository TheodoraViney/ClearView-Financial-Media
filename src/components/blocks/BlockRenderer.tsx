import type { BrandKey } from '@/brands'
import type { AdUnits } from '@/lib/gam'
import type { ArticleListingContext } from '@/sanity/categories-view'
import type { DynamicFetchOptions } from '@/sanity/live'
import type { RecordListingContext } from '@/sanity/shared-listings-view'

import { ArticleListing } from './ArticleListing'
import { AwardsWinners } from './AwardsWinners'
import { BenefitPanel } from './BenefitPanel'
import { ContactForm } from './ContactForm'
import { Cta } from './Cta'
import { EnquiryForm } from './EnquiryForm'
import { ExploreGrid } from './ExploreGrid'
import { FeaturedStories } from './FeaturedStories'
import { Highlights } from './Highlights'
import { MostReadSidebar } from './MostReadSidebar'
import { ImageHero } from './ImageHero'
import { NewsletterSignup } from './NewsletterSignup'
import { NumberedList } from './NumberedList'
import { OpportunityCards } from './OpportunityCards'
import { PageHero } from './PageHero'
import { PostBriefs } from './PostBriefs'
import { PostCards } from './PostCards'
import { Publications } from './Publications'
import { RecordListing } from './RecordListing'
import { RelatedTopics } from './RelatedTopics'
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
 * `articles` is the Categories route's state and list; the articles list block renders nothing without it, and the
 * page heading block takes the Categories form with it.
 * `options` are the route's fetch options (perspective, stega), for the blocks that load their own data (Most read).
 */
export function BlockRenderer({
  blocks,
  brand,
  today,
  now,
  ads,
  options,
  listing,
  articles,
}: {
  blocks: PageBlock[] | null | undefined
  brand: BrandKey
  today: string
  now: string
  ads: AdUnits
  options: DynamicFetchOptions
  listing?: RecordListingContext
  articles?: ArticleListingContext
}) {
  if (!blocks?.length) {
    return null
  }

  return (
    <>
      {blocks.map((block) => (
        <Block
          key={block._key}
          block={block}
          brand={brand}
          today={today}
          now={now}
          ads={ads}
          options={options}
          listing={listing}
          articles={articles}
        />
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
  options,
  listing,
  articles,
}: {
  block: PageBlock
  brand: BrandKey
  today: string
  now: string
  ads: AdUnits
  options: DynamicFetchOptions
  listing?: RecordListingContext
  articles?: ArticleListingContext
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
            <BlockRenderer
              blocks={blocks}
              brand={brand}
              today={today}
              now={now}
              ads={ads}
              options={options}
              listing={listing}
              articles={articles}
            />
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
      return <PageHero block={block} brand={brand} articles={articles} />
    case 'recordListing':
      return listing ? <RecordListing block={block} brand={brand} listing={listing} /> : null
    case 'articleListing':
      return articles ? <ArticleListing block={block} brand={brand} articles={articles} /> : null
    case 'relatedTopics':
      return <RelatedTopics block={block} brand={brand} />
    // Sidebar only.
    case 'awardsWinners':
      return <AwardsWinners block={block} brand={brand} unit={ads.awardsWinners} />
    case 'mostReadSidebar':
      return <MostReadSidebar block={block} brand={brand} options={options} />
    // Landing page blocks (Sponsorship).
    case 'imageHero':
      return <ImageHero block={block} brand={brand} />
    case 'numberedList':
      return <NumberedList block={block} brand={brand} />
    case 'benefitPanel':
      return <BenefitPanel block={block} brand={brand} />
    case 'opportunityCards':
      return <OpportunityCards block={block} brand={brand} />
    case 'enquiryForm':
      return <EnquiryForm block={block} brand={brand} />
    // Contact page.
    case 'contactForm':
      return <ContactForm block={block} brand={brand} />
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
