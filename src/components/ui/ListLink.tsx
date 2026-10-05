import Link from 'next/link'
import { type ReactNode } from 'react'

import { cx } from './cx'
import { Meta } from './Meta'
import { EASE, type Motion } from './motion'

const VARIANTS = {
  default: { text: 'text-foreground', hover: 'hover:text-grey' },
  inverse: { text: 'text-white', hover: 'hover:opacity-75' },
}

// Title plus meta line, used in the awards, events and research lists.
// Without href the item renders as plain content, with no hover state. An empty meta renders no line.
// `motion` picks the hover easing, see motion.ts.
export function ListLink({
  href,
  title,
  meta,
  variant = 'default',
  motion = 'smooth',
  className,
}: {
  href?: string | null
  title: string
  meta: ReactNode[]
  variant?: keyof typeof VARIANTS
  motion?: Motion
  className?: string
}) {
  const classes = cx('flex flex-col gap-2', VARIANTS[variant].text, href && VARIANTS[variant].hover, className)

  const content = (
    <>
      <span className="text-base leading-title font-medium">{title}</span>
      {meta.length > 0 && <Meta items={meta} variant={variant} />}
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
