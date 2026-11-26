import { stegaClean } from 'next-sanity'

import type { MediaImage } from '@/components/ui/Media'

import { dataset, projectId } from './env'

/** The image fields the IMAGE fragment projects (and the raw image in a Portable Text body). */
type SanityImage = {
  asset?: { _ref?: string | null } | null
  crop?: { top?: number | null; bottom?: number | null; left?: number | null; right?: number | null } | null
  hotspot?: { x?: number | null; y?: number | null } | null
  alt?: string | null
}

// `image-<hash>-<width>x<height>-<ext>`: Sanity writes the original pixel size into every image asset id.
const ASSET_REF = /^image-([0-9a-f]+)-(\d+)x(\d+)-([a-z0-9]+)$/

const clamp = (value: number) => Math.min(1, Math.max(0, value))
const percent = (value: number) => `${Math.round(clamp(value) * 10000) / 100}%`

/**
 * A Sanity image as a plain, CMS-agnostic MediaImage, or null without an asset.
 * - `src`: the CDN URL with the editor's crop as `rect` and no width; the image loader adds the width per srcset entry.
 * - `width`/`height`: the pixel size after the crop. Read from the asset reference id, not from projected metadata,
 *   so the queries need no asset dereference and a raw Portable Text image works too.
 * - `position`: the hotspot as CSS `object-position`, relative to the cropped image.
 * - `alt`: the field's alt, else the media library's (`coalesce` in the IMAGE fragment), cleaned of stega; empty when neither exists.
 */
export function toImage(image: SanityImage | null | undefined): MediaImage | null {
  const match = ASSET_REF.exec(stegaClean(image?.asset?._ref) ?? '')

  if (!image || !match) {
    return null
  }

  const [, hash, w, h, ext] = match
  const width = Number(w)
  const height = Number(h)

  // An SVG goes out untouched (no loader parameters), so its crop is not applied either.
  const editorCrop = ext === 'svg' ? null : image.crop
  const crop = {
    top: editorCrop?.top ?? 0,
    bottom: editorCrop?.bottom ?? 0,
    left: editorCrop?.left ?? 0,
    right: editorCrop?.right ?? 0,
  }
  // Rounded as @sanity/image-url rounds its `rect`.
  const left = Math.round(crop.left * width)
  const top = Math.round(crop.top * height)
  const cropWidth = Math.round(width - crop.right * width - left)
  const cropHeight = Math.round(height - crop.bottom * height - top)
  const cropped = left !== 0 || top !== 0 || cropWidth !== width || cropHeight !== height

  const base = `https://cdn.sanity.io/images/${projectId}/${dataset}/${hash}-${width}x${height}.${ext}`
  const src = cropped ? `${base}?rect=${left},${top},${cropWidth},${cropHeight}` : base

  const hotspot = image.hotspot
  const spanX = 1 - crop.left - crop.right
  const spanY = 1 - crop.top - crop.bottom
  const position =
    typeof hotspot?.x === 'number' && typeof hotspot.y === 'number' && spanX > 0 && spanY > 0
      ? `${percent((hotspot.x - crop.left) / spanX)} ${percent((hotspot.y - crop.top) / spanY)}`
      : undefined

  return {
    src,
    width: cropWidth,
    height: cropHeight,
    alt: stegaClean(image.alt) ?? '',
    position,
  }
}

/**
 * A Sanity image as a link-preview image (Open Graph), cut to `width`×`height` on the Sanity CDN: the editor's crop
 * first (`rect` from toImage), then a cover crop around the hotspot (`crop=focalpoint`, the hotspot relative to the
 * cropped image). An SVG is rendered as PNG, since link previews do not show SVG. Null without an asset.
 */
export function toShareImage(
  image: SanityImage | null | undefined,
  { width = 1200, height = 630 }: { width?: number; height?: number } = {},
): { url: string; width: number; height: number; alt: string } | null {
  const media = toImage(image)

  if (!media) {
    return null
  }

  const [src, rect] = media.src.split('?')
  const focal = /^([\d.]+)% ([\d.]+)%$/.exec(media.position ?? '')
  const params = [
    ...(rect ? [rect] : []),
    `w=${width}`,
    `h=${height}`,
    'fit=crop',
    ...(focal ? ['crop=focalpoint', `fp-x=${Number(focal[1]) / 100}`, `fp-y=${Number(focal[2]) / 100}`] : []),
    ...(src.endsWith('.svg') ? ['fm=png'] : []),
  ]

  return { url: `${src}?${params.join('&')}`, width, height, alt: media.alt }
}
