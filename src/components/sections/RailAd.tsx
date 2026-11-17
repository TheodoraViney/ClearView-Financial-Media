import { AD_SLOT_FITS, AD_SLOT_UNSET, AdSlot } from '@/components/ui/AdSlot'
import { cx } from '@/components/ui/cx'
import { adPositionLabel, type AdUnitView } from '@/lib/gam'

/**
 * The Top and Side banners of the article page's layout (the `rail` Two columns, on the Categories page). Top heads the
 * main column with its 16 / 32 / 64 inset; Side heads the rail, full rail width.
 */
export function RailAd({ position, unit }: { position: 'top' | 'side'; unit: AdUnitView | null }) {
  if (position === 'side') {
    // The sidebar is already a complementary landmark: its banner gets no landmark of its own.
    return (
      <div className={cx('w-full', !unit && AD_SLOT_UNSET)}>
        <AdSlot size="mpu" look="publication" unit={unit} label={adPositionLabel('side')} />
      </div>
    )
  }

  // Hidden with its spacing where the column is too narrow for a leaderboard (`AD_SLOT_FITS`), or with no unit.
  return (
    <div className={cx('@container px-gutter header:px-16', !unit && AD_SLOT_UNSET)}>
      <div role="complementary" aria-label="Advertisement, top" className={cx('pt-6 md:pt-10', unit && AD_SLOT_FITS.leaderboard)}>
        <AdSlot size="leaderboard" look="publication" unit={unit} label={adPositionLabel('top')} />
      </div>
    </div>
  )
}
