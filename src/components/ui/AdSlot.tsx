import { cx } from './cx'
import type { ShellVariant } from './motion'

// Reserved ad space. Heights come from the design so the slot never shifts layout when GAM fills it.
const SIZES = {
  leaderboard: 'min-h-16 md:min-h-22.5',
  billboard: 'min-h-16 md:min-h-18 lg:min-h-22.5',
  // 300 × 250 box, narrower on a viewport that cannot fit it. Its alignment depends on the look, below.
  mpu: 'aspect-6/5 w-75 max-w-full',
}

export type AdSlotSize = keyof typeof SIZES

export function isAdSlotSize(value: unknown): value is AdSlotSize {
  return typeof value === 'string' && Object.hasOwn(SIZES, value)
}

/**
 * `group` (ClearView, the default): dashed border, transparent surface, label 13 / 14 / 16 regular, MPU centred.
 * `publication` (WB / WBA / FWR, shared-shell `ad-slot`): solid brand border on the brand tint, label 500 uppercase
 * with 0.04em tracking, 12 on mobile and 14 from md (MPU 14 everywhere), MPU left-aligned below the header breakpoint
 * and centred from it. Colours come from the brand tokens either way.
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
  look = 'group',
  className,
}: {
  size?: AdSlotSize
  label?: string
  look?: ShellVariant
  className?: string
}) {
  const styles = LOOKS[look]
  const mpu = size === 'mpu'

  return (
    <div
      className={cx(
        'flex items-center justify-center rounded-sm border border-ad-border bg-ad-surface',
        styles.box,
        SIZES[size],
        mpu ? styles.mpu : styles.leaderboard,
        className,
      )}
    >
      {label && (
        <span className={cx('text-center text-ad-foreground uppercase', mpu ? styles.mpuLabel : styles.label)}>
          {label}
        </span>
      )}
    </div>
  )
}
