import type { StegaBranded } from 'next-sanity'

import type { BrandKey } from '@/brands'
import type { PAGE_QUERY_RESULT } from '@/sanity/types'

/**
 * One projected member of a page's `blocks[]`, as the strict live fetch returns it: strings are
 * branded as possibly stega-encoded until stegaClean runs. HOME_PAGE_QUERY projects the same shape.
 */
export type PageBlock = StegaBranded<NonNullable<NonNullable<PAGE_QUERY_RESULT>['blocks']>[number]>

export type PageBlockType = PageBlock['_type']

export type BlockOf<T extends PageBlockType> = Extract<PageBlock, { _type: T }>

export type BlockProps<T extends PageBlockType> = {
  block: BlockOf<T>
  brand: BrandKey
}
