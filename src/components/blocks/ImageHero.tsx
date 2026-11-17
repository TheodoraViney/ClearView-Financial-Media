import { ImageHero as ImageHeroSection } from '@/components/sections/ImageHero'
import { resolveHref } from '@/lib/links'
import { toHeading } from '@/sanity/heading'
import { toImage } from '@/sanity/image'

import type { BlockProps } from './types'

/** Hero with image. Text keeps stega for click-to-edit; the button goes through resolveHref (scheme allowlist, `#id`). */
export function ImageHero({ block, brand }: BlockProps<'imageHero'>) {
  const href = resolveHref(block.button, brand)
  const label = block.button?.label ?? ''

  return (
    <ImageHeroSection
      breadcrumb={[{ label: block.breadcrumbHomeLabel ?? '', href: '/' }, { label: block.breadcrumbLabel ?? '' }]}
      eyebrow={block.eyebrow ?? ''}
      heading={toHeading(block.heading)}
      standfirst={block.standfirst ?? ''}
      button={href && label ? { href, label } : null}
      image={toImage(block.image)}
    />
  )
}
