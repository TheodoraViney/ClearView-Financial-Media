import type { BrandKey } from '@/brands'
import { AdSlot, type AdSlotSpacing } from '@/components/sections/AdSlot'
import type { AdSlotSize } from '@/components/ui/AdSlot'
import type { ShellVariant } from '@/components/ui/motion'
import { adPositionLabel, type AdUnits } from '@/lib/gam'

/** The positions a page template places around its blocks. The article banner and Awards Winners MPU sit inside theirs. */
export type PagePosition = 'top' | 'side' | 'banner3' | 'banner4'

// Box and vertical rhythm per position, from the ClearView Home design and the publication home designs.
const PLACEMENTS = {
  group: {
    top: { size: 'leaderboard', spacing: 'around' },
    side: { size: 'mpu', spacing: 'aside' },
    banner3: { size: 'billboard', spacing: 'belowSection' },
    banner4: { size: 'leaderboard', spacing: 'none' },
  },
  publication: {
    top: { size: 'leaderboard', spacing: 'top' },
    side: { size: 'mpu', spacing: 'aside' },
    banner3: { size: 'leaderboard', spacing: 'divided' },
    banner4: { size: 'leaderboard', spacing: 'none' },
  },
} as const satisfies Record<ShellVariant, Record<PagePosition, { size: AdSlotSize; spacing: AdSlotSpacing }>>

/**
 * A fixed banner position of a page template, showing the brand's unit from Brand settings. Without a unit it is
 * hidden on the live site and shows its labelled placeholder in draft mode.
 */
export function PageAd({
  position,
  ads,
  brand,
}: {
  position: PagePosition
  ads: Partial<Pick<AdUnits, PagePosition>>
  brand: BrandKey
}) {
  const look = brand === 'clearview' ? 'group' : 'publication'
  const { size, spacing } = PLACEMENTS[look][position]

  return <AdSlot size={size} spacing={spacing} look={look} unit={ads[position] ?? null} label={adPositionLabel(position)} />
}
