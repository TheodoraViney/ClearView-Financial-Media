import { cx } from './cx'
import { Media, type MediaImage } from './Media'

// 40px round portrait. Without a photo it shows the initials on the brand tint.
const TEXT = {
  sm: 'text-caption leading-none',
  lg: 'text-title-lg',
}

// `md` 40 (default); `lg` 56 with the initials 16/16 500 grey on the neutral `surface-thumb` (shared-shell speaker-card).
const SIZES = {
  md: { box: 'size-10', thumb: 'sm', sizes: '40px', initials: 'bg-surface-hover text-accent ring-1 ring-accent-subtle ring-inset' },
  lg: { box: 'size-14', thumb: 'lg', sizes: '56px', initials: 'bg-surface-thumb text-base leading-none text-grey' },
} as const

export function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}

export function Avatar({
  name,
  image,
  text = 'sm',
  size = 'md',
  className,
}: {
  name: string
  image?: MediaImage | null
  /** Initials size of the 40px avatar; `size="lg"` sets its own. */
  text?: keyof typeof TEXT
  size?: keyof typeof SIZES
  className?: string
}) {
  const look = SIZES[size]

  if (image) {
    return <Media image={{ ...image, alt: '' }} sizes={look.sizes} thumb={look.thumb} round className={className} />
  }

  return (
    <span
      aria-hidden="true"
      className={cx(
        'flex shrink-0 items-center justify-center rounded-full font-medium',
        look.box,
        look.initials,
        size === 'md' && TEXT[text],
        className,
      )}
    >
      {initialsOf(name)}
    </span>
  )
}
