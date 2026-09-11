import type { PAGE_QUERY_RESULT } from '@/sanity/types'

import { Cta } from './Cta'

type Blocks = NonNullable<NonNullable<PAGE_QUERY_RESULT>['blocks']>

export function BlockRenderer({ blocks }: { blocks: Blocks | null }) {
  if (!blocks) {
    return null
  }

  return (
    <>
      {blocks.map((block) => {
        switch (block._type) {
          case 'cta':
            return <Cta key={block._key} {...block} />
          default:
            return null
        }
      })}
    </>
  )
}
