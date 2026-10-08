import Image from 'next/image'
import { type ReactNode } from 'react'

import { cx } from './cx'

/** An image after crop, from `toImage()`: the URL without a width, its pixel size, alt text and the hotspot as CSS `object-position`. */
export type MediaImage = {
  src: string
  width: number
  height: number
  alt: string
  position?: string
}

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

const isSvg = (src: string) => src.split('?', 1)[0]?.toLowerCase().endsWith('.svg') ?? false

/**
 * An image in a box. `sizes` is a plain upper bound of the rendered width per breakpoint (vw or px). Where the
 * `object-cover` box crops the sides (fixed height or a ratio narrower than the image), it is box height × 16/9.
 * `natural` lets the image set its own height (full width, no crop), for article bodies.
 * The global loader (src/sanity/image-loader.ts) asks the Sanity CDN for each width; SVGs are served as they are.
 */
export function Media({
  image,
  sizes,
  ratio,
  thumb,
  natural = false,
  zoom = false,
  priority = false,
  className,
  children,
}: {
  image?: MediaImage | null
  sizes: string
  ratio?: keyof typeof RATIOS
  thumb?: keyof typeof THUMBS
  natural?: boolean
  zoom?: boolean | 'lg'
  priority?: boolean
  className?: string
  children?: ReactNode
}) {
  const shared = {
    src: image?.src ?? '',
    sizes,
    unoptimized: image ? isSvg(image.src) : false,
    // `priority` is deprecated in Next 16; the docs recommend eager loading with a high fetch priority for the LCP image.
    loading: priority ? ('eager' as const) : undefined,
    fetchPriority: priority ? ('high' as const) : undefined,
    style: image?.position ? { objectPosition: image.position } : undefined,
  }
  const zoomClass = zoom && ZOOM[zoom === 'lg' ? 'lg' : 'all']

  return (
    <div
      className={cx(
        'relative shrink-0 overflow-hidden rounded-sm bg-light',
        ratio && RATIOS[ratio],
        thumb && THUMBS[thumb],
        className,
      )}
    >
      {image &&
        (natural ? (
          <Image {...shared} alt={image.alt} width={image.width} height={image.height} className={cx('h-auto w-full', zoomClass)} />
        ) : (
          <Image {...shared} alt={image.alt} fill className={cx('object-cover', zoomClass)} />
        ))}
      {children && <div className="absolute inset-0">{children}</div>}
    </div>
  )
}
