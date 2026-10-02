import { stegaClean } from 'next-sanity'

import { AdSlot as AdSlotSection, isAdSlotSpacing } from '@/components/sections/AdSlot'

import type { BlockProps } from './types'

export function AdSlot({ block }: BlockProps<'adSlot'>) {
  const size = stegaClean(block.size) === 'billboard' ? 'billboard' : 'leaderboard'
  const spacing = stegaClean(block.spacing)

  return (
    <AdSlotSection
      size={size}
      label={block.label ?? undefined}
      spacing={isAdSlotSpacing(spacing) ? spacing : 'around'}
    />
  )
}
