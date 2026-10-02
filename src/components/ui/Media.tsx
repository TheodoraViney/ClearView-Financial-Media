import Image from 'next/image'
import { type ReactNode } from 'react'

import { cx } from './cx'

const RATIOS = {
  '16/9': 'aspect-video',
  '4/3': 'aspect-4/3',
  '3/2': 'aspect-3/2',
  square: 'aspect-square',
}

// Without `ratio` or `thumb` the caller sizes the box through className, e.g. responsive aspect classes.
// `children` render as an overlay layer above the image (slider dots, badges).

// Fixed thumbnail sizes from the design.
const THUMBS = {
  xs: 'size-9',
  sm: 'size-10',
  md: 'size-16 md:size-20',
  report: 'h-10 w-7',
}

// Hover zoom on the parent `group`: `true` on every breakpoint, `'lg'` from desktop only.
const ZOOM = {
  all: 'transition-transform duration-200 ease-smooth group-hover:scale-102',
  lg: 'transition-transform duration-200 ease-smooth lg:group-hover:scale-102',
}

export function Media({
  src,
  alt,
  ratio,
  thumb,
  sizes = '100vw',
  zoom = false,
  priority = false,
  className,
  children,
}: {
  src?: string | null
  alt: string
  ratio?: keyof typeof RATIOS
  thumb?: keyof typeof THUMBS
  sizes?: string
  zoom?: boolean | 'lg'
  priority?: boolean
  className?: string
  children?: ReactNode
}) {
  return (
    <div
      className={cx(
        'relative shrink-0 overflow-hidden rounded-sm bg-light',
        ratio && RATIOS[ratio],
        thumb && THUMBS[thumb],
        className,
      )}
    >
      {src && (
        <Image
          src={src}
          alt={alt}
          fill
          sizes={thumb ? '80px' : sizes}
          // `priority` is deprecated in Next 16; the docs recommend eager loading with a high fetch priority for the LCP image.
          loading={priority ? 'eager' : undefined}
          fetchPriority={priority ? 'high' : undefined}
          className={cx(
            'object-cover',
            zoom && ZOOM[zoom === 'lg' ? 'lg' : 'all'],
          )}
        />
      )}
      {children && <div className="absolute inset-0">{children}</div>}
    </div>
  )
}
