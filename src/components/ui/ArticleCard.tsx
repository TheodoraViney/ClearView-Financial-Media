import Link from 'next/link'
import { type ReactNode } from 'react'

import { cx } from './cx'
import { BREAKPOINTS, Media, type MediaImage, type MediaWidths, withBox } from './Media'
import { Meta } from './Meta'

// Vertical story card. Desktop uses fixed image heights that alternate (tall), smaller screens use 4:3.
// The image takes the post image's own alt text (decision 2026-10-06). It zooms on hover from desktop only.
// `widths` is the card's width per breakpoint, which the parent grid decides; the card adds its own image height
// (4:3 below lg, 280 or 400 from lg), so `widths` must have an `lg` entry.
export function ArticleCard({
  href,
  title,
  meta,
  image,
  widths,
  tall = false,
  className,
}: {
  href: string
  title: string
  meta: ReactNode[]
  image?: MediaImage | null
  widths: MediaWidths
  tall?: boolean
  className?: string
}) {
  return (
    <Link href={href} className={cx('group flex flex-col gap-4 lg:gap-0', className)}>
      <Media
        image={image}
        slot={withBox(widths, (rem) => (rem >= BREAKPOINTS.lg ? { h: tall ? 400 : 280 } : { aspect: 4 / 3 }))}
        ratio="4/3"
        zoom="lg"
        className={cx('lg:aspect-auto', tall ? 'lg:h-100' : 'lg:h-70')}
      />
      <div
        className={cx(
          'flex flex-col gap-3 pr-2 lg:py-6',
          tall ? 'lg:pr-8' : 'lg:pr-4',
        )}
      >
        <span className="text-title-md font-medium text-pretty text-foreground">
          {title}
        </span>
        <Meta items={meta} />
      </div>
    </Link>
  )
}
