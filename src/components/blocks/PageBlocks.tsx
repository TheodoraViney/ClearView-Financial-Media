import { type ReactNode } from 'react'

import type { BrandKey } from '@/brands'
import type { AdUnits } from '@/lib/gam'
import type { RecordListingContext } from '@/sanity/shared-listings-view'

import { BlockRenderer } from './BlockRenderer'
import { PageAd, type PageSidebar } from './PageAd'
import { SplitLayout } from './SplitLayout'
import type { PageBlock } from './types'

/**
 * A page's blocks with the template's Top and Side banners, which come only together with a right column: when the
 * first block is a Two columns block, the Top banner heads its main column and the Side banner its sidebar. A page
 * without a right column carries neither. `intro` (a page title) comes before the blocks. `listing` is the shared
 * listings route's tab, URL and records, for its record listing block; `sidebar` the Side banner's sidebar (`PageAd`).
 */
export function PageBlocks({
  blocks,
  brand,
  today,
  now,
  ads,
  intro,
  listing,
  sidebar,
}: {
  blocks: PageBlock[] | null | undefined
  brand: BrandKey
  today: string
  now: string
  ads: AdUnits
  intro?: ReactNode
  listing?: RecordListingContext
  sidebar?: PageSidebar
}) {
  const [first, ...rest] = blocks ?? []

  if (first?._type !== 'splitLayout') {
    return (
      <>
        {intro}
        <BlockRenderer blocks={blocks} brand={brand} today={today} now={now} ads={ads} listing={listing} />
      </>
    )
  }

  return (
    <>
      {intro}
      <SplitLayout
        block={first}
        brand={brand}
        top={<PageAd position="top" ads={ads} brand={brand} />}
        side={<PageAd position="side" ads={ads} brand={brand} sidebar={sidebar} />}
        renderBlocks={(columnBlocks) => (
          <BlockRenderer blocks={columnBlocks} brand={brand} today={today} now={now} ads={ads} listing={listing} />
        )}
      />
      <BlockRenderer blocks={rest} brand={brand} today={today} now={now} ads={ads} listing={listing} />
    </>
  )
}
