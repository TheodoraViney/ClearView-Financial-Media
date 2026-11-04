import { stegaClean } from 'next-sanity'

import { AdSlot as AdSlotSection, isAdSlotSpacing } from '@/components/sections/AdSlot'
import { isAdSlotSize } from '@/components/ui/AdSlot'
import { toAdUnitView } from '@/lib/gam'

import type { BlockProps } from './types'

export function AdSlot({ block, brand }: BlockProps<'adSlot'>) {
  const size = stegaClean(block.size)
  const spacing = stegaClean(block.spacing)

  return (
    <AdSlotSection
      size={isAdSlotSize(size) ? size : 'leaderboard'}
      label={block.label ?? undefined}
      unit={toAdUnitView(stegaClean(block.unit))}
      spacing={isAdSlotSpacing(spacing) ? spacing : 'around'}
      look={brand === 'clearview' ? 'group' : 'publication'}
    />
  )
}
