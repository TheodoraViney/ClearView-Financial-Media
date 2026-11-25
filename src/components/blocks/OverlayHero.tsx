import { OverlayHero as OverlayHeroSection } from '@/components/sections/OverlayHero'
import { toHeading } from '@/sanity/heading'
import { toImage } from '@/sanity/image'

import type { BlockProps } from './types'

/** Hero over image. Text keeps stega for click-to-edit. */
export function OverlayHero({ block }: BlockProps<'overlayHero'>) {
  return (
    <OverlayHeroSection
      headingId={`${block._key}-heading`}
      breadcrumb={[{ label: block.breadcrumbHomeLabel ?? '', href: '/' }, { label: block.breadcrumbLabel ?? '' }]}
      heading={toHeading(block.heading)}
      standfirst={block.standfirst ?? ''}
      image={toImage(block.image)}
    />
  )
}
