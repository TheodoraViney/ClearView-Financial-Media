import { stegaClean } from 'next-sanity'

import { BenefitPanel as BenefitPanelSection, type BenefitPanelItem } from '@/components/sections/BenefitPanel'
import { toHeading } from '@/sanity/heading'
import { toImage } from '@/sanity/image'

import type { BlockProps } from './types'

type Item = NonNullable<BlockProps<'benefitPanel'>['block']['items']>[number]

function toItem(item: Item): BenefitPanelItem | null {
  if (!stegaClean(item.title)?.trim()) {
    return null
  }

  return { key: item._key, title: item.title ?? '', description: item.description ?? '' }
}

export function BenefitPanel({ block }: BlockProps<'benefitPanel'>) {
  const items = (block.items ?? []).map(toItem).filter((item): item is BenefitPanelItem => item !== null)
  const image = toImage(block.image)

  return (
    <BenefitPanelSection
      headingId={`${block._key}-heading`}
      heading={toHeading(block.heading)}
      // Decorative background: always alt="".
      image={image && { ...image, alt: '' }}
      items={items}
    />
  )
}
