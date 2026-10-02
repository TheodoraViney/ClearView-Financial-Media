import { cx } from './cx'

// Reserved ad space. Heights come from the design so the slot never shifts layout when GAM fills it.
const SIZES = {
  leaderboard: 'min-h-16 md:min-h-22.5',
  billboard: 'min-h-16 md:min-h-18 lg:min-h-22.5',
}

export type AdSlotSize = keyof typeof SIZES

export function AdSlot({
  size = 'leaderboard',
  label,
  className,
}: {
  size?: AdSlotSize
  label?: string
  className?: string
}) {
  return (
    <div
      className={cx(
        'flex items-center justify-center rounded-sm border border-dashed border-ad-border bg-ad-surface px-4 py-3 lg:px-6 lg:py-4',
        SIZES[size],
        className,
      )}
    >
      {label && (
        <span className="text-center text-caption leading-title text-ad-foreground uppercase md:text-sm md:leading-title lg:text-base lg:leading-title">
          {label}
        </span>
      )}
    </div>
  )
}
