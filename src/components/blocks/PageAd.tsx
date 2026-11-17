import type { BrandKey } from '@/brands'
import { AdSlot, type AdSlotSpacing } from '@/components/sections/AdSlot'
import { RailAd } from '@/components/sections/RailAd'
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
 * The sidebar a Side banner heads: `home` (the homes and pages, the default), `listing` (the shared listings page) or
 * `rail` (the article page's layout, on the Categories page; it places the Top banner too, see RailAd).
 */
export type PageSidebar = 'home' | 'listing' | 'rail'

/**
 * A fixed banner position of a page template, showing the brand's unit from Brand settings. Without a unit it is
 * hidden on the live site and shows its labelled placeholder in draft mode. `sidebar="listing"` gives the Side banner
 * the shared listings sidebar's inset and left alignment (`asideListing`).
 */
export function PageAd({
  position,
  ads,
  brand,
  sidebar = 'home',
}: {
  position: PagePosition
  ads: Partial<Pick<AdUnits, PagePosition>>
  brand: BrandKey
  sidebar?: PageSidebar
}) {
  if (sidebar === 'rail' && (position === 'top' || position === 'side')) {
    return <RailAd position={position} unit={ads[position] ?? null} />
  }

  const look = brand === 'clearview' ? 'group' : 'publication'
  const { size, spacing: placed } = PLACEMENTS[look][position]
  const spacing: AdSlotSpacing = position === 'side' && sidebar === 'listing' ? 'asideListing' : placed

  return <AdSlot size={size} spacing={spacing} look={look} unit={ads[position] ?? null} label={adPositionLabel(position)} />
}
