import { stegaClean } from 'next-sanity'

import { brandOrigin, EDITORIAL_BRAND_KEYS } from '@/brands'
import { TeamNetwork as TeamNetworkSection, type TeamNetworkLogo } from '@/components/sections/TeamNetwork'
import { toHeading } from '@/sanity/heading'
import { toImage } from '@/sanity/image'

import type { BlockProps } from './types'

type Publication = NonNullable<BlockProps<'teamNetwork'>['block']['publications']>[number]

// The editorial brands' Brand settings logos, in the order of EDITORIAL_BRAND_KEYS. The alt is the logo's own, else
// the brand title (stega kept for click-to-edit). Each links to the brand's origin, as the Publications cards do.
function toLogos(publications: Publication[]): TeamNetworkLogo[] {
  return EDITORIAL_BRAND_KEYS.flatMap((key) => {
    const publication = publications.find((item) => stegaClean(item.key) === key)
    const image = toImage(publication?.logo)

    if (!publication || !image) {
      return []
    }

    return [
      {
        key,
        image: { ...image, alt: stegaClean(image.alt)?.trim() ? image.alt : (publication.title ?? '') },
        href: brandOrigin(key),
      },
    ]
  })
}

export function TeamNetwork({ block }: BlockProps<'teamNetwork'>) {
  return (
    <TeamNetworkSection
      headingId={`${block._key}-heading`}
      heading={toHeading(block.heading)}
      image={toImage(block.image)}
      logos={toLogos(block.publications ?? [])}
      body={block.body?.length ? block.body : null}
      quote={block.quote?.length ? block.quote : null}
      quoteCaption={block.quoteCaption ?? ''}
    />
  )
}
