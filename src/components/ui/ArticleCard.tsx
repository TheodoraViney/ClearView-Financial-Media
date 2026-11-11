import Link from 'next/link'
import { type ReactNode } from 'react'

import { ArrowLink } from './ArrowLink'
import { cx } from './cx'
import { Media, type MediaImage } from './Media'
import { Meta } from './Meta'

// Vertical story card. Desktop uses fixed image heights that alternate (tall), smaller screens use 4:3.
// The image takes the post image's own alt text (decision 2026-10-06). It zooms on hover from desktop only.
// `sizes` comes from the parent grid, which decides the card width (the image is 4:3 below lg, 280 or 400 high from lg).
// `variant="stacked"` is the article page's recommended card: 3:2 image on every breakpoint, meta above the title,
// brand-coloured hover and a slow zoom. Its source order is title, meta, image, so the link's accessible name starts
// with the title; `order-first` draws the image, then the meta, above the title.
// `variant="pick"` is the publication home's Top Picks card: 16:10 image, meta (accent category with `metaAccent`, then the
// date, both 500), a 20/24 headline clamped to 3 lines and the summary clamped to 2; brand-coloured hover, slow zoom.
// Same source order trick as `stacked`.
// `variant="grid"` is the Categories list card: 3:2 image (the `light` placeholder when there is none), meta
// "Category | date", a 20/24 headline and the accent "Read article ›" label (`readLabel`); the whole card is the link,
// with an accent hover over 180ms ease-out and the slow zoom. Same source order trick as `stacked`.
export function ArticleCard({
  href,
  title,
  meta,
  image,
  sizes,
  tall = false,
  variant = 'featured',
  summary,
  metaAccent = false,
  readLabel,
  className,
}: {
  href: string
  title: string
  meta: ReactNode[]
  image?: MediaImage | null
  sizes: string
  tall?: boolean
  variant?: 'featured' | 'stacked' | 'pick' | 'grid'
  /** `pick` only. */
  summary?: string | null
  /** `pick` only: the first meta item is the category, drawn in the accent. */
  metaAccent?: boolean
  /** `grid` only: the visible link label under the headline. */
  readLabel?: string
  className?: string
}) {
  if (variant === 'grid') {
    return (
      <Link
        href={href}
        className={cx('group flex min-w-0 flex-col gap-4 text-foreground transition-colors duration-180 ease-out hover:text-accent', className)}
      >
        <span className="flex flex-col gap-3">
          <span className="text-title-lg font-medium text-pretty">{title}</span>
          {meta.length > 0 && <Meta items={meta} className="order-first leading-none" />}
        </span>
        <Media image={image} sizes={sizes} ratio="3/2" zoom="slow" className="order-first w-full" />
        {readLabel && (
          <ArrowLink variant="accent" hover="static">
            {readLabel}
          </ArrowLink>
        )}
      </Link>
    )
  }

  if (variant === 'pick') {
    return (
      <Link
        href={href}
        className={cx('group flex flex-col gap-4 text-foreground transition-colors duration-180 ease-out hover:text-accent', className)}
      >
        <div className="flex min-w-0 flex-col gap-3">
          <span className="line-clamp-3 text-title-lg font-medium">{title}</span>
          {meta.length > 0 && (
            <Meta items={meta} accentFirst={metaAccent} className="order-first leading-none font-medium" />
          )}
          {summary && <span className="line-clamp-2 text-sm text-grey">{summary}</span>}
        </div>
        <Media image={image} sizes={sizes} zoom="slow" className="order-first aspect-16/10 w-full" />
      </Link>
    )
  }

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
