import { type ReactNode } from 'react'

import type { BrandKey } from '@/brands'
import type { AdUnits } from '@/lib/gam'
import type { ArticleListingContext } from '@/sanity/categories-view'
import type { CompanyEngagementContext } from '@/sanity/company-engagement-view'
import type { DynamicFetchOptions } from '@/sanity/live'
import type { RecordListingContext } from '@/sanity/shared-listings-view'

import { BlockRenderer } from './BlockRenderer'
import { PageAd, type PageSidebar } from './PageAd'
import { SplitLayout } from './SplitLayout'
import type { PageBlock } from './types'

/**
 * A page's blocks with the template's Top and Side banners, which come only together with a right column: when the
 * first block is a Two columns block, the Top banner heads its main column and the Side banner its sidebar. A page
 * without a right column carries neither. `intro` (a page title, or the Company Engagement page's own Top banner) comes
 * before the blocks. `listing` is the shared listings route's tab, URL and records, for its record listing block;
 * `articles` the Categories route's state and list, for its blocks; `companies` the Company Engagement route's records
 * and URL state, for its blocks; `options` the route's fetch options, for blocks that load their own data (Most read);
 * `sidebar` the Side banner's sidebar (`PageAd`), `rail` also the Two columns layout.
 */
export function PageBlocks({
  blocks,
  brand,
  today,
  now,
  ads,
  options,
  intro,
  listing,
  articles,
  companies,
  sidebar,
}: {
  blocks: PageBlock[] | null | undefined
  brand: BrandKey
  today: string
  now: string
  ads: AdUnits
  options: DynamicFetchOptions
  intro?: ReactNode
  listing?: RecordListingContext
  articles?: ArticleListingContext
  companies?: CompanyEngagementContext
  sidebar?: PageSidebar
}) {
  const [first, ...rest] = blocks ?? []

  if (first?._type !== 'splitLayout') {
    return (
      <>
        {intro}
        <BlockRenderer blocks={blocks} brand={brand} today={today} now={now} ads={ads} options={options} listing={listing} articles={articles} companies={companies} />
      </>
    )
  }

  return (
    <>
      {intro}
      <SplitLayout
        block={first}
        brand={brand}
        variant={sidebar === 'rail' ? 'rail' : undefined}
        top={<PageAd position="top" ads={ads} brand={brand} sidebar={sidebar} />}
        side={<PageAd position="side" ads={ads} brand={brand} sidebar={sidebar} />}
        renderBlocks={(columnBlocks) => (
          <BlockRenderer blocks={columnBlocks} brand={brand} today={today} now={now} ads={ads} options={options} listing={listing} articles={articles} companies={companies} />
        )}
      />
      <BlockRenderer blocks={rest} brand={brand} today={today} now={now} ads={ads} options={options} listing={listing} articles={articles} companies={companies} />
    </>
  )
}
