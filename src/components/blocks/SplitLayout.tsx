import { type ReactNode } from 'react'

import { SplitLayout as SplitLayoutSection } from '@/components/sections/SplitLayout'

import type { BlockProps, PageBlock } from './types'

// BlockRenderer passes itself in as renderBlocks, which keeps the import graph acyclic.
export function SplitLayout({
  block,
  renderBlocks,
}: BlockProps<'splitLayout'> & {
  renderBlocks: (blocks: PageBlock[]) => ReactNode
}) {
  const main = block.main ?? []
  const aside = block.aside ?? []

  return (
    <SplitLayoutSection
      main={renderBlocks(main)}
      aside={aside.length > 0 ? renderBlocks(aside) : undefined}
    />
  )
}
