import Image from 'next/image'

import { cx } from './cx'

const RATIOS = {
  '16/9': 'aspect-video',
  '4/3': 'aspect-4/3',
  '3/2': 'aspect-3/2',
  square: 'aspect-square',
}

// Fixed thumbnail sizes from the design.
const THUMBS = {
  xs: 'size-9',
  sm: 'size-10',
  md: 'size-16 md:size-20',
  report: 'h-10 w-7',
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
}: {
  src?: string | null
  alt: string
  ratio?: keyof typeof RATIOS
  thumb?: keyof typeof THUMBS
  sizes?: string
  zoom?: boolean
  priority?: boolean
  className?: string
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
          priority={priority}
          className={cx(
            'object-cover',
            zoom &&
              'transition-transform duration-200 ease-smooth group-hover:scale-102',
          )}
        />
      )}
    </div>
  )
}
