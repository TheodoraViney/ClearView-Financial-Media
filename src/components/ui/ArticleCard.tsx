import Link from 'next/link'
import { type ReactNode } from 'react'

import { cx } from './cx'
import { Media, type MediaImage } from './Media'
import { Meta } from './Meta'

// Vertical story card. Desktop uses fixed image heights that alternate (tall), smaller screens use 4:3.
// The image takes the post image's own alt text (decision 2026-10-06). It zooms on hover from desktop only.
// `sizes` comes from the parent grid, which decides the card width (the image is 4:3 below lg, 280 or 400 high from lg).
// `variant="stacked"` is the article page's recommended card: 3:2 image on every breakpoint, meta above the title,
// brand-coloured hover and a slow zoom. Its source order is title, meta, image, so the link's accessible name starts
// with the title; `order-first` draws the image, then the meta, above the title.
export function ArticleCard({
  href,
  title,
  meta,
  image,
  sizes,
  tall = false,
  variant = 'featured',
  className,
}: {
  href: string
  title: string
  meta: ReactNode[]
  image?: MediaImage | null
  sizes: string
  tall?: boolean
  variant?: 'featured' | 'stacked'
  className?: string
}) {
  if (variant === 'stacked') {
    return (
      <Link
        href={href}
        className={cx('group flex flex-col gap-4 text-foreground transition-colors duration-180 ease-out hover:text-accent', className)}
      >
        <div className="flex flex-col gap-3">
          <span className="text-base leading-title font-medium text-pretty">{title}</span>
          {meta.length > 0 && <Meta items={meta} className="order-first leading-none" />}
        </div>
        {image && <Media image={image} sizes={sizes} ratio="3/2" zoom="slow" className="order-first" />}
      </Link>
    )
  }

  return (
    <Link href={href} className={cx('group flex flex-col gap-4 lg:gap-0', className)}>
      <Media
        image={image}
        sizes={sizes}
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
