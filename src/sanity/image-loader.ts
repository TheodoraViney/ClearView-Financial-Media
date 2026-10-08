'use client'

import type { ImageLoaderProps } from 'next/image'

// The one quality for every image; `images.qualities` in next.config.ts allows only this value.
export const IMAGE_QUALITY = 80

/**
 * Global `next/image` loader (`images.loaderFile`): Sanity CDN images are resized and encoded by Sanity once,
 * with no second pass through the Next.js optimizer. `fit=max` never upscales past the source (or its crop `rect`,
 * which toImage() puts in `src` and is kept). SVGs and any other URL are returned unchanged.
 */
export default function sanityImageLoader({ src, width, quality }: ImageLoaderProps): string {
  if (!src.startsWith('https://cdn.sanity.io/images/')) {
    return src
  }

  const url = new URL(src)

  if (url.pathname.toLowerCase().endsWith('.svg')) {
    return src
  }

  url.searchParams.set('w', String(width))
  url.searchParams.set('q', String(quality ?? IMAGE_QUALITY))
  url.searchParams.set('auto', 'format')
  url.searchParams.set('fit', 'max')

  // URLSearchParams encodes the commas in `rect`; Sanity reads either form, the plain one is easier to read.
  return url.href.replaceAll('%2C', ',')
}
