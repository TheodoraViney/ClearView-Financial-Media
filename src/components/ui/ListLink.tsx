import Link from 'next/link'
import { type ReactNode } from 'react'

import { cx } from './cx'
import { Meta } from './Meta'

const VARIANTS = {
  default: 'text-foreground hover:text-grey',
  inverse: 'text-white hover:opacity-75',
}

// Title plus meta line, used in the awards, events and research lists.
export function ListLink({
  href,
  title,
  meta,
  variant = 'default',
  className,
}: {
  href: string
  title: string
  meta: ReactNode[]
  variant?: keyof typeof VARIANTS
  className?: string
}) {
  return (
    <Link
      href={href}
      className={cx(
        'flex flex-col gap-2 transition duration-180 ease-smooth',
        VARIANTS[variant],
        className,
      )}
    >
      <span className="text-base leading-title font-medium">{title}</span>
      <Meta items={meta} variant={variant} />
    </Link>
  )
}
