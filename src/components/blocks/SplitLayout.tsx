import { type ReactNode } from 'react'

import { SplitLayout as SplitLayoutSection } from '@/components/sections/SplitLayout'

import type { BlockProps, PageBlock } from './types'

/**
 * BlockRenderer passes itself in as renderBlocks, which keeps the import graph acyclic. `top` and `side` are the
 * page's Top and Side banners when this is the page's first block (PageBlocks); they head the two columns.
 */
export function SplitLayout({
  block,
  top,
  side,
  renderBlocks,
}: BlockProps<'splitLayout'> & {
  top?: ReactNode
  side?: ReactNode
  renderBlocks: (blocks: PageBlock[]) => ReactNode
}) {
  const main = block.main ?? []
  const aside = block.aside ?? []

  return (
    <SplitLayoutSection
      main={
        <>
          {top}
          {renderBlocks(main)}
        </>
      }
      aside={
        aside.length > 0 || side ? (
          <>
            {side}
            {renderBlocks(aside)}
          </>
        ) : undefined
      }
    />
  )
}
