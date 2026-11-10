import { stegaClean } from 'next-sanity'

import { brandOrigin, EDITORIAL_BRAND_KEYS, isBrandKey } from '@/brands'
import { Publications as PublicationsSection, type PublicationCard } from '@/components/sections/Publications'
import type { AdUnitView } from '@/lib/gam'
import { brandTitle } from '@/sanity/brand-title'
import { toHeading } from '@/sanity/heading'
import { toImage } from '@/sanity/image'

import type { BlockProps } from './types'

type Card = NonNullable<BlockProps<'publications'>['block']['cards']>[number]

const isEditorialKey = (key: string): key is (typeof EDITORIAL_BRAND_KEYS)[number] =>
  (EDITORIAL_BRAND_KEYS as readonly string[]).includes(key)

function toCard(card: Card): PublicationCard | null {
  // Only the brand is cleaned: heading, body, description and link label keep stega for click-to-edit.
  const key = stegaClean(card.brand)
  const image = toImage(card.image)

  if (!key || !isBrandKey(key) || !isEditorialKey(key) || !image) {
    return null
  }

  // From the brand's Brand settings, stega kept so the card title is click-to-edit.
  const title = brandTitle(key, card.brandTitle)

  return {
    key: card._key,
    title,
    description: card.description ?? '',
    // A code constant from brands.ts, not CMS input, so it needs no safeHref.
    href: brandOrigin(key),
    image,
    linkLabel: card.linkLabel ?? '',
  }
}

/** `unit` is the brand's "Banner after Publications" unit, shown under the cards. */
export function Publications({ block, brand, unit }: BlockProps<'publications'> & { unit: AdUnitView | null }) {
  const cards = (block.cards ?? []).map(toCard).filter((card): card is PublicationCard => card !== null)

  // The design sets this heading as the page H1.
  const heading = toHeading(block.heading)

  return (
    <PublicationsSection
      heading={heading}
      body={block.body ?? undefined}
      cards={cards}
      banner={unit}
      look={brand === 'clearview' ? 'group' : 'publication'}
    />
  )
}
