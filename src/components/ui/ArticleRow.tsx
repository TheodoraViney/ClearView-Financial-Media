import Link from 'next/link'
import { type ReactNode } from 'react'

import { cx } from './cx'
import { Icon } from './Icon'
import { Media } from './Media'
import { Meta } from './Meta'

// Horizontal story row. Mobile and tablet: divided list row; desktop: bordered card.
// The parent list supplies the top border on mobile/tablet and the grid on desktop.
export function ArticleRow({
  href,
  title,
  meta,
  image,
  className,
}: {
  href: string
  title: string
  meta: ReactNode[]
  image?: string | null
  className?: string
}) {
  return (
    <Link
      href={href}
      className={cx(
        'group flex items-center gap-4 border-b border-border py-4 transition-colors duration-180 ease-smooth hover:bg-surface-hover lg:min-h-23.5 lg:items-start lg:rounded-sm lg:border lg:p-4',
        className,
      )}
    >
      <Media src={image} alt={title} thumb="md" className="lg:size-9" />
      <div className="flex min-w-0 flex-1 flex-col gap-3 lg:self-stretch lg:justify-center">
        <div className="flex gap-2">
          <span className="min-w-0 flex-1 text-base leading-title font-medium text-pretty text-foreground lg:line-clamp-2">
            {title}
          </span>
          <span className="hidden h-5 items-center lg:flex">
            <Icon
              name="chevron-right"
              className="transition-transform duration-180 ease-smooth group-hover:translate-x-0.75"
            />
          </span>
        </div>
        <Meta items={meta} />
      </div>
      <span className="flex size-6 items-center justify-center text-foreground lg:hidden">
        <Icon name="chevron-right" />
      </span>
    </Link>
  )
}
