import { stegaClean } from 'next-sanity'

import { StatsBar as StatsBarSection, type StatsBarItem } from '@/components/sections/StatsBar'
import { type StatsBarIcon, isStatsBarIcon } from '@/lib/stats-bar'
import { toHeading } from '@/sanity/heading'

import type { BlockProps } from './types'

type Item = NonNullable<BlockProps<'statsBar'>['block']['items']>[number]

// The icon key is a lookup value, so it is cleaned; an unknown key renders the tile without an icon.
function toIcon(value: string | null | undefined): StatsBarIcon | null {
  const key = stegaClean(value)

  return isStatsBarIcon(key) ? key : null
}

// Value and label keep stega so click-to-edit works; only the emptiness check reads the cleaned text.
function toItem(item: Item): StatsBarItem | null {
  if (!stegaClean(item.value)?.trim() || !stegaClean(item.label)?.trim()) {
    return null
  }

  return { key: item._key, icon: toIcon(item.icon), value: item.value ?? '', label: item.label ?? '' }
}

export function StatsBar({ block }: BlockProps<'statsBar'>) {
  const items = (block.items ?? []).map(toItem).filter((item): item is StatsBarItem => item !== null)

  return <StatsBarSection heading={toHeading(block.heading)} items={items} />
}
