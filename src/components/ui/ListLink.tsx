import Link from 'next/link'
import { type ReactNode } from 'react'

import { cx } from './cx'
import { Icon } from './Icon'
import { Meta } from './Meta'
import { EASE, type Motion } from './motion'

const VARIANTS = {
  default: { text: 'text-foreground', hover: 'hover:text-grey' },
  inverse: { text: 'text-white', hover: 'hover:opacity-75' },
  // Brand-coloured hover (article Most read).
  accent: { text: 'text-foreground', hover: 'hover:text-accent' },
  // Full-width row: title and a chevron on the right, bottom rule, accent hover, no meta (shared-shell category-item:
  // Categories "Explore related topics"). The parent's grid hides the last row's rule.
  row: { text: 'text-foreground', hover: 'hover:text-accent' },
}

// Title plus meta line, used in the awards, events and research lists.
// Without href the item renders as plain content, with no hover state. An empty meta renders no line.
// `motion` picks the hover easing, see motion.ts.
export function ListLink({
  href,
  title,
  meta = [],
  variant = 'default',
  motion = 'smooth',
  relaxed = false,
  metaClassName,
  className,
}: {
  href?: string | null
  title: string
  /** Not shown by `row`. */
  meta?: ReactNode[]
  variant?: keyof typeof VARIANTS
  motion?: Motion
  /** 16px between title and meta instead of 8 (shared-shell other-awards-programme-card `relaxed`). Not used by `row`. */
  relaxed?: boolean
  // Extra classes for the meta line, e.g. `leading-none` where the design sets it 13/13 (Explore cards).
  metaClassName?: string
  className?: string
}) {
  const row = variant === 'row'
  const classes = cx(
    row
      ? // 56px minimum; the keyboard outline sits inside the row, because the parent list clips its last rule.
        'flex min-h-14 items-center justify-between gap-3 border-b border-border py-4 focus-visible:-outline-offset-2'
      : cx('flex flex-col', relaxed ? 'gap-4' : 'gap-2'),
    VARIANTS[variant].text,
    href && VARIANTS[variant].hover,
    className,
  )

  const content = row ? (
    <>
      <span className="min-w-0 text-base leading-title font-medium">{title}</span>
      <Icon name="chevron-right" />
    </>
  ) : (
    <>
      <span className="text-base leading-title font-medium">{title}</span>
      {meta.length > 0 && (
        <Meta
          items={meta}
          variant={variant === 'inverse' ? 'inverse' : 'default'}
          className={cx(variant === 'accent' && 'leading-none', metaClassName)}
        />
      )}
    </>
  )

  if (!href) {
    return <div className={classes}>{content}</div>
  }

  return (
    <Link href={href} className={cx(classes, 'transition', EASE[motion])}>
      {content}
    </Link>
  )
}
