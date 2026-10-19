import { stegaClean } from 'next-sanity'

import { AdSlot as AdSlotSection, isAdSlotSpacing } from '@/components/sections/AdSlot'
import { isAdSlotSize } from '@/components/ui/AdSlot'

import type { BlockProps } from './types'

export function AdSlot({ block }: BlockProps<'adSlot'>) {
  const size = stegaClean(block.size)
  const spacing = stegaClean(block.spacing)

  return (
    <AdSlotSection
      size={isAdSlotSize(size) ? size : 'leaderboard'}
      label={block.label ?? undefined}
      spacing={isAdSlotSpacing(spacing) ? spacing : 'around'}
    />
  )
}
