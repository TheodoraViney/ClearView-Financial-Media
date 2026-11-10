import { GAM_NETWORK_CODE, type AdUnitView } from '@/lib/gam'

import { cx } from './cx'
import { AdFill } from './Gpt.client'
import type { ShellVariant } from './motion'

// Reserved ad space. Heights come from the design so the slot never shifts layout when GAM fills it.
const SIZES = {
  leaderboard: 'min-h-16 md:min-h-22.5',
  billboard: 'min-h-16 md:min-h-18 lg:min-h-22.5',
  // 300 × 250 box, narrower on a viewport that cannot fit it. Its alignment depends on the look, below.
  mpu: 'aspect-6/5 w-75 max-w-full',
}

export type AdSlotSize = keyof typeof SIZES

/**
 * Hides a 728 × 90 position where its container is narrower than the banner (phones, small tablets), as the legacy
 * sites do. A container query, so it holds from the first paint and nothing shifts. Put it on the element that also
 * carries the position's vertical spacing, inside an `@container` whose content box is the box's width.
 */
export const AD_SLOT_FITS = {
  leaderboard: '@max-leaderboard:hidden',
  billboard: '@max-leaderboard:hidden',
  mpu: '',
} satisfies Record<AdSlotSize, string>

/**
 * A position with no ad unit set: hidden on the live site, shown in draft mode so editors can still find and fill
 * it in Presentation. Put it on the element that carries the position's spacing, in place of `AD_SLOT_FITS`.
 */
export const AD_SLOT_UNSET = 'hidden in-data-preview:block'

/**
 * `group` (ClearView, the default): dashed border, transparent surface, label 13 / 14 / 16 regular, MPU centred.
 * `publication` (WB / WBA / FWR, shared-shell `ad-slot`): solid brand border on the brand tint, label 500 uppercase
 * with 0.04em tracking, 12 on mobile and 14 from md (MPU 14 everywhere), MPU left-aligned below the header breakpoint
 * and centred from it. Colours come from the brand tokens either way.
 *
 * The placeholder label shows only in draft mode (Studio, Presentation, `[data-preview]`): on the live site an empty
 * slot is a plain box.
 */
const LOOKS = {
  group: {
    box: 'border-dashed px-4 py-3 lg:px-6 lg:py-4',
    leaderboard: '',
    mpu: 'mx-auto',
    label: 'text-caption leading-title md:text-sm md:leading-title lg:text-base lg:leading-title',
    mpuLabel: 'text-caption leading-title md:text-sm md:leading-title lg:text-base lg:leading-title',
  },
  publication: {
    box: 'border-solid',
    leaderboard: 'px-4 py-3',
    mpu: 'px-6 py-4 header:mx-auto',
    label: 'text-xs leading-title font-medium tracking-ad text-balance md:text-sm md:leading-title',
    mpuLabel: 'text-sm leading-title font-medium tracking-ad text-balance',
  },
}

export function AdSlot({
  size = 'leaderboard',
  label,
  unit,
  look = 'group',
  className,
}: {
  size?: AdSlotSize
  label?: string
  /** The Google Ad Manager unit the box shows; without one the box requests nothing (callers hide it, `AD_SLOT_UNSET`). */
  unit?: AdUnitView | null
  look?: ShellVariant
  className?: string
}) {
  const styles = LOOKS[look]
  const mpu = size === 'mpu'

  return (
    <div
      className={cx(
        'relative flex items-center justify-center rounded-sm border border-ad-border bg-ad-surface',
        styles.box,
        SIZES[size],
        mpu ? styles.mpu : styles.leaderboard,
        className,
      )}
    >
      {label && (
        <span className={cx('hidden text-center text-ad-foreground uppercase in-data-preview:inline', mpu ? styles.mpuLabel : styles.label)}>
          {label}
        </span>
      )}
      {unit && GAM_NETWORK_CODE && <AdFill unit={unit} />}
    </div>
  )
}
