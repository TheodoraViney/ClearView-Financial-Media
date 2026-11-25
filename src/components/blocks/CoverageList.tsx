import { stegaClean } from 'next-sanity'

import { CoverageList as CoverageListSection, type CoverageListItem } from '@/components/sections/CoverageList'
import { type CoverageListIcon, isCoverageListIcon } from '@/lib/coverage-list'
import { toHeading } from '@/sanity/heading'

import type { BlockProps } from './types'

type Item = NonNullable<BlockProps<'coverageList'>['block']['items']>[number]

// The icon key is a lookup value, so it is cleaned; an unknown key renders the topic without an icon.
function toIcon(value: string | null | undefined): CoverageListIcon | null {
  const key = stegaClean(value)

  return isCoverageListIcon(key) ? key : null
}

function toItem(item: Item): CoverageListItem | null {
  if (!stegaClean(item.title)?.trim()) {
    return null
  }

  return { key: item._key, icon: toIcon(item.icon), title: item.title ?? '', description: item.description?.length ? item.description : null }
}

export function CoverageList({ block }: BlockProps<'coverageList'>) {
  const items = (block.items ?? []).map(toItem).filter((item): item is CoverageListItem => item !== null)

  return (
    <CoverageListSection
      headingId={`${block._key}-heading`}
      heading={toHeading(block.heading)}
      text={block.text ?? ''}
      listHeading={toHeading(block.listHeading)}
      items={items}
    />
  )
}
