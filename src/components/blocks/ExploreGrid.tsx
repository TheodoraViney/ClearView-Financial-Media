import { stegaClean } from 'next-sanity'

import { BRANDS, showsListMeta } from '@/brands'
import { ExploreGrid as ExploreGridSection, type ExploreCard } from '@/components/sections/ExploreGrid'
import { iconMap, type IconName } from '@/components/ui/Icon'
import type { DestinationCardItem } from '@/components/ui/DestinationCard'
import { formatMediumDate } from '@/lib/dates'
import { sharedRecordHref } from '@/lib/links'
import { toHeading } from '@/sanity/heading'

import { isSource, recordMeta } from './Highlights'
import { picksThenFill, postHref, toLinkProps } from './post-card'
import type { BlockProps } from './types'

/** Items per card when its count is empty, and the most: EXPLORE_CARD_ITEM_MAX in the schema. */
const MAX_ITEMS = 3

type Card = NonNullable<BlockProps<'exploreGrid'>['block']['cards']>[number]
type Item = NonNullable<NonNullable<Card['items']>[number]>

const SOURCE_TYPES = {
  posts: 'post',
  awards: 'awardsProgramme',
  events: 'conferenceEvent',
  research: 'resource',
} as const

const isIcon = (value: string | null | undefined): value is IconName => Boolean(value) && Object.hasOwn(iconMap, value!)

function itemCount(count: number | null | undefined): number {
  const value = stegaClean(count)

  return typeof value === 'number' && Number.isInteger(value) && value >= 1 ? Math.min(value, MAX_ITEMS) : MAX_ITEMS
}

/**
 * One card item. Posts: title and date only. Awards, events and research: the sidebar's meta rule
 * with the publication date style ("18 Nov 2026 | Dubai").
 */
function toItem(item: Item, card: Card, brand: BlockProps<'exploreGrid'>['brand'], today: string): DestinationCardItem | null {
  if (item._type === 'post') {
    const date = showsListMeta(brand, 'posts') ? formatMediumDate(stegaClean(item.publishedAt)) : null

    return { key: item._id, title: item.title ?? '', href: postHref(item, brand), meta: date ? [date] : [] }
  }

  const source = stegaClean(card.source)

  if (!isSource(source)) {
    return null
  }

  return {
    key: item._id,
    title: item.title ?? '',
    href: sharedRecordHref(item._type, item.slug, brand),
    meta:
      source === 'events' || showsListMeta(brand, source) ? recordMeta(item, source, card.deadlineLabel, today, 'short') : [],
  }
}

function toCard(card: Card, brand: BlockProps<'exploreGrid'>['brand'], today: string): ExploreCard {
  const source = stegaClean(card.source)
  const type = source && Object.hasOwn(SOURCE_TYPES, source) ? SOURCE_TYPES[source as keyof typeof SOURCE_TYPES] : null
  // Picks of another type than the card's source (validation bypassed, source changed) are dropped.
  const ofType = (items: (Item | null)[] | null | undefined) =>
    (items ?? []).filter((item): item is Item => item !== null && item._type === type)
  const icon = stegaClean(card.icon)

  return {
    key: card._key,
    heading: toHeading(card.heading),
    icon: isIcon(icon) ? icon : null,
    items: picksThenFill(ofType(card.items), ofType(card.fill as (Item | null)[] | null), itemCount(card.count))
      .map((item) => toItem(item, card, brand, today))
      .filter((item): item is DestinationCardItem => item !== null),
    button: toLinkProps(card.button, brand),
  }
}

/**
 * `today` is the UK date the page query ran with, for the awards meta rule (open nominations show the deadline).
 * A card with no items (no picks and an empty fill) is hidden and the remaining cards take its place.
 */
export function ExploreGrid({ block, brand, today }: BlockProps<'exploreGrid'> & { today: string }) {
  return (
    <ExploreGridSection
      // Screen-reader name only; the section has no visible heading (design).
      label={`Explore ${BRANDS[brand].title}`}
      cards={(block.cards ?? []).map((card) => toCard(card, brand, today)).filter((card) => card.items.length > 0)}
    />
  )
}
