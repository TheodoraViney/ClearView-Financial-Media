import type { StegaBranded } from 'next-sanity'

import type { BrandKey } from '@/brands'
import type { PAGE_QUERY_RESULT } from '@/sanity/types'

type TopLevelBlock = NonNullable<NonNullable<PAGE_QUERY_RESULT>['blocks']>[number]

// A Two columns block's members. Awards Winners lives only in a sidebar, so it is a page block only through here.
type ColumnBlock = NonNullable<Extract<TopLevelBlock, { _type: 'splitLayout' }>['aside' | 'main']>[number]

/**
 * One projected block of a page, top level or inside a Two columns block, as the strict live fetch returns it:
 * strings are branded as possibly stega-encoded until stegaClean runs. HOME_PAGE_QUERY projects the same shape.
 */
export type PageBlock = StegaBranded<TopLevelBlock | ColumnBlock>

export type PageBlockType = PageBlock['_type']

export type BlockOf<T extends PageBlockType> = Extract<PageBlock, { _type: T }>

export type BlockProps<T extends PageBlockType> = {
  block: BlockOf<T>
  brand: BrandKey
}
