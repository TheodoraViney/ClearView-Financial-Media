import { stegaClean } from 'next-sanity'

import { NumberedList as NumberedListSection, type NumberedListItem } from '@/components/sections/NumberedList'
import { toHeading } from '@/sanity/heading'

import type { BlockProps } from './types'

type Item = NonNullable<BlockProps<'numberedList'>['block']['items']>[number]

// Text keeps stega; only the emptiness check reads the cleaned value.
function toItem(item: Item): NumberedListItem | null {
  if (!stegaClean(item.title)?.trim()) {
    return null
  }

  return { key: item._key, title: item.title ?? '', description: item.description ?? '' }
}

export function NumberedList({ block }: BlockProps<'numberedList'>) {
  const items = (block.items ?? []).map(toItem).filter((item): item is NumberedListItem => item !== null)

  return <NumberedListSection headingId={`${block._key}-heading`} heading={toHeading(block.heading)} items={items} />
}
