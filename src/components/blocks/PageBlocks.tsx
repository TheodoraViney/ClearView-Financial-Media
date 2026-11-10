import { type ReactNode } from 'react'

import type { BrandKey } from '@/brands'
import type { AdUnits } from '@/lib/gam'

import { BlockRenderer } from './BlockRenderer'
import { PageAd } from './PageAd'
import { SplitLayout } from './SplitLayout'
import type { PageBlock } from './types'

/**
 * A page's blocks with the template's Top and Side banners, which come only together with a right column: when the
 * first block is a Two columns block, the Top banner heads its main column and the Side banner its sidebar. A page
 * without a right column carries neither. `intro` (a page title) comes before the blocks.
 */
export function PageBlocks({
  blocks,
  brand,
  today,
  now,
  ads,
  intro,
}: {
  blocks: PageBlock[] | null | undefined
  brand: BrandKey
  today: string
  now: string
  ads: AdUnits
  intro?: ReactNode
}) {
  const [first, ...rest] = blocks ?? []

  if (first?._type !== 'splitLayout') {
    return (
      <>
        {intro}
        <BlockRenderer blocks={blocks} brand={brand} today={today} now={now} ads={ads} />
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
        side={<PageAd position="side" ads={ads} brand={brand} />}
        renderBlocks={(columnBlocks) => (
          <BlockRenderer blocks={columnBlocks} brand={brand} today={today} now={now} ads={ads} />
        )}
      />
      <BlockRenderer blocks={rest} brand={brand} today={today} now={now} ads={ads} />
    </>
  )
}
