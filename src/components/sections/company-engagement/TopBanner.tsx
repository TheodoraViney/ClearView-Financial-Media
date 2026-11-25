import { AD_SLOT_FITS, AD_SLOT_UNSET, AdSlot } from '@/components/ui/AdSlot'
import { cx } from '@/components/ui/cx'
import { adPositionLabel, type AdUnitView } from '@/lib/gam'

import { PAD } from './layout'

/**
 * The Company Engagement page's Top banner, placed by the route above the blocks: the page has no right column, which
 * carries the Top banner on other block pages. Hidden with its spacing where the page is too narrow for a leaderboard
 * (`AD_SLOT_FITS`), or with no unit.
 */
export function TopBanner({ unit }: { unit: AdUnitView | null }) {
  return (
    <div className={cx(`@container ${PAD}`, !unit && AD_SLOT_UNSET)}>
      <div
        role="complementary"
        aria-label="Advertisement, top"
        className={cx('pt-6 md:pt-8 header:pt-10', unit && AD_SLOT_FITS.leaderboard)}
      >
        <AdSlot size="leaderboard" unit={unit} label={adPositionLabel('top')} />
      </div>
    </div>
  )
}
