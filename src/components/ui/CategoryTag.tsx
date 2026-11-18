import { cx } from './cx'

const SIZES = {
  // shared-shell category-tag-large: 40px, 16/20 (awards programme Categories).
  md: 'min-h-10 px-4 py-2.5 leading-5',
  // Research report contributor chip (report-contributors): at least 56px, 16px inside, 16/20.8 500.
  lg: 'min-h-14 p-4 leading-title font-medium',
}

/**
 * shared-shell category-tag-large: a bordered label, 16px text, radius 4 (awards programme Categories; `size="lg"`
 * research report contributors). Not a link here, so the design's hover tint (surface-subtle + border-plus ring) is
 * left out: on a non-interactive element it would suggest an action that is not there.
 */
export function CategoryTag({
  label,
  size = 'md',
  className,
}: {
  label: string
  size?: keyof typeof SIZES
  className?: string
}) {
  return (
    <span
      className={cx(
        'inline-flex max-w-full items-center rounded-sm bg-white text-base text-foreground inset-ring inset-ring-border wrap-anywhere',
        SIZES[size],
        className,
      )}
    >
      {label}
    </span>
  )
}
