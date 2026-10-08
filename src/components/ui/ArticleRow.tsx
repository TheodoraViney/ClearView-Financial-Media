import Link from 'next/link'
import { type ReactNode } from 'react'

import { cx } from './cx'
import { Icon } from './Icon'
import { Media, type MediaImage, type MediaSlot } from './Media'
import { Meta } from './Meta'

// The thumbnail is 64, 80 from md, 36 from lg (`lg:size-9` over the md thumb).
const THUMB_SLOT: MediaSlot = {
  base: { w: '64px', aspect: 1 },
  md: { w: '80px', aspect: 1 },
  lg: { w: '36px', aspect: 1 },
}

// Horizontal story row. Mobile and tablet: divided list row; desktop: bordered card.
// The parent list supplies the top border on mobile/tablet and the grid on desktop.
export function ArticleRow({
  href,
  title,
  meta,
  image,
  className,
}: {
  // Without href the row renders as plain content, with no hover state or chevrons.
  href?: string | null
  title: string
  meta: ReactNode[]
  image?: MediaImage | null
  className?: string
}) {
  const classes = cx(
    'flex items-center gap-4 border-b border-border py-4 lg:min-h-23.5 lg:items-start lg:rounded-sm lg:border lg:p-4',
    href && 'group transition-colors duration-180 ease-smooth hover:bg-surface-hover',
    className,
  )

  const content = (
    <>
      <Media image={image && { ...image, alt: '' }} slot={THUMB_SLOT} thumb="md" className="lg:size-9" />
      <div className="flex min-w-0 flex-1 flex-col gap-3 lg:self-stretch lg:justify-center">
        <div className="flex gap-2">
          <span className="min-w-0 flex-1 text-base leading-title font-medium text-pretty text-foreground lg:line-clamp-2">
            {title}
          </span>
          {href && (
            <span className="hidden h-4.5 items-center lg:flex">
              <Icon
                name="chevron-right"
                className="transition-transform duration-180 ease-smooth group-hover:translate-x-0.75"
              />
            </span>
          )}
        </div>
        <Meta items={meta} />
      </div>
      {href && (
        <span className="flex size-6 items-center justify-center text-foreground lg:hidden">
          <Icon name="chevron-right" />
        </span>
      )}
    </>
  )

  if (!href) {
    return <div className={classes}>{content}</div>
  }

  return (
    <Link href={href} className={classes}>
      {content}
    </Link>
  )
}
