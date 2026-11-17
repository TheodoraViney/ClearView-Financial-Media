import { stegaClean } from 'next-sanity'

import { OpportunityCards as OpportunityCardsSection, type OpportunityCard } from '@/components/sections/OpportunityCards'
import type { BrandKey } from '@/brands'
import { resolveHref } from '@/lib/links'
import { type OpportunityCardIcon, isOpportunityCardIcon } from '@/lib/opportunity-cards'
import { toHeading } from '@/sanity/heading'

import type { BlockProps } from './types'

type Card = NonNullable<BlockProps<'opportunityCards'>['block']['cards']>[number]

// The icon key is a lookup value, so it is cleaned; an unknown key renders the card without an icon.
function toIcon(value: string | null | undefined): OpportunityCardIcon | null {
  const key = stegaClean(value)

  return isOpportunityCardIcon(key) ? key : null
}

function toCard(card: Card, brand: BrandKey): OpportunityCard | null {
  if (!stegaClean(card.heading)?.trim()) {
    return null
  }

  const href = resolveHref(card.link, brand)
  const label = card.link?.label ?? ''

  return {
    key: card._key,
    icon: toIcon(card.icon),
    label: card.label ?? '',
    heading: card.heading ?? '',
    copy: card.copy ?? '',
    // Plain strings have no _key; the index is stable for a server render of one document version.
    benefits: (card.benefits ?? []).flatMap((text, index) =>
      stegaClean(text)?.trim() ? [{ key: String(index), text }] : [],
    ),
    link: href && label ? { href, label } : null,
  }
}

export function OpportunityCards({ block, brand }: BlockProps<'opportunityCards'>) {
  const cards = (block.cards ?? [])
    .map((card) => toCard(card, brand))
    .filter((card): card is OpportunityCard => card !== null)

  return <OpportunityCardsSection headingId={`${block._key}-heading`} heading={toHeading(block.heading)} cards={cards} />
}
