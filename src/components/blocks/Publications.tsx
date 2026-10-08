import { stegaClean } from 'next-sanity'

import { BRANDS, brandOrigin, EDITORIAL_BRAND_KEYS, isBrandKey } from '@/brands'
import { Publications as PublicationsSection, type PublicationCard } from '@/components/sections/Publications'
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

  const title = BRANDS[key].title

  return {
    key: card._key,
    title,
    description: card.description ?? '',
    // A code constant from brands.ts, not CMS input, so it needs no safeHref.
    href: brandOrigin(key),
    // The title sits in the same link, so the image is decorative.
    image: { ...image, alt: '' },
    linkLabel: card.linkLabel ?? '',
  }
}

export function Publications({ block }: BlockProps<'publications'>) {
  const cards = (block.cards ?? []).map(toCard).filter((card): card is PublicationCard => card !== null)

  // The design sets this heading as the page H1.
  const heading = toHeading(block.heading)

  return <PublicationsSection heading={heading} body={block.body ?? undefined} cards={cards} />
}
