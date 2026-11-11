import Image from 'next/image'
import Link from 'next/link'
import { useId } from 'react'

import { cx } from './cx'
import { isSvg } from './Media'
import { Meta } from './Meta'

/** A result's thumbnail: a Sanity CDN URL (resized by the loader) or a site path such as `/archive-media/...` (served as is). */
export type SearchResultImage = { src: string; width?: number; height?: number; alt?: string }

// Hover zoom on the whole-card link, 600ms ease-smooth as the design: a cover photo 1.02, a contained cover or logo 1.05.
const FITS = {
  cover: 'object-cover group-hover:scale-102',
  contain: 'object-contain drop-shadow-cover group-hover:scale-105',
}

/**
 * shared-shell search-result-card, `image-slot="reserved"`: one row link with a bottom rule (the list draws the top
 * one). Text on 8 of 12 columns and the 3:2 thumbnail on columns 10–12 from md; `1fr 112px` on mobile. The thumbnail
 * slot is reserved even without an image, so titles align down the list. `imageFit="contain"` shows the whole
 * image at 82% of the frame's height with a shadow (research covers, logos).
 */
export function SearchResultCard({
  href,
  typeLabel,
  date,
  meta,
  title,
  summary,
  image,
  imageFit,
}: {
  href: string
  typeLabel: string
  date: string | null
  meta: string[]
  title: string
  summary: string | null
  image: SearchResultImage | null
  imageFit?: 'contain'
}) {
  const fit = imageFit ?? 'cover'
  // The link is named by the title alone, not the whole row (type, date, meta, summary and the thumbnail's alt).
  const titleId = useId()

  return (
    <Link
      href={href}
      prefetch={false}
      aria-labelledby={titleId}
      className="group grid grid-cols-result items-start gap-4 border-b border-border py-6 text-foreground md:grid-cols-12 md:gap-6 header:gap-8"
    >
      <span className="flex min-w-0 flex-col gap-3 md:col-span-8">
        <Meta items={[typeLabel, ...(date ? [date] : []), ...meta]} accentFirst strongFirst className="leading-none" />
        <span
          id={titleId}
          className="text-base font-medium text-pretty break-words transition-colors duration-180 ease-out group-hover:text-accent group-focus-visible:text-accent max-md:leading-title md:text-title-lg"
        >
          {title}
        </span>
        {summary && <span className="line-clamp-2 text-base leading-copy text-pretty text-grey">{summary}</span>}
      </span>
      <span
        className={cx(
          'relative aspect-3/2 overflow-hidden rounded-sm md:col-span-3 md:col-start-10',
          image && 'bg-surface-thumb',
        )}
      >
        {image && (
          <span className={cx('absolute inset-x-0', fit === 'contain' ? 'inset-y-cover' : 'inset-y-0')}>
            <Image
              src={image.src}
              // The media's own alt text, else the title: the thumbnail is exposed, not decorative.
              alt={image.alt || title}
              fill
              // The slot is 112px on mobile and at most about 220px wide from md, 3:2. A cover photo is cropped at
              // the sides, so the bound is the slot height × 16/9 (about 75 / 146px high).
              sizes="(min-width: 48rem) 256px, 136px"
              // Archive media is served as is: the loader only resizes Sanity CDN URLs, so a srcset would repeat one URL.
              unoptimized={isSvg(image.src) || image.src.startsWith('/archive-media/')}
              className={cx('transition-transform duration-600 ease-smooth', FITS[fit])}
            />
          </span>
        )}
      </span>
    </Link>
  )
}
