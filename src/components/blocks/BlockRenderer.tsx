import type { BrandKey } from '@/brands'

import { AdSlot } from './AdSlot'
import { Cta } from './Cta'
import { Highlights } from './Highlights'
import { Publications } from './Publications'
import { SplitLayout } from './SplitLayout'
import { TopStories } from './TopStories'
import type { PageBlock } from './types'

export function BlockRenderer({
  blocks,
  brand,
}: {
  blocks: PageBlock[] | null | undefined
  brand: BrandKey
}) {
  if (!blocks?.length) {
    return null
  }

  return (
    <>
      {blocks.map((block) => (
        <Block key={block._key} block={block} brand={brand} />
      ))}
    </>
  )
}

function Block({ block, brand }: { block: PageBlock; brand: BrandKey }) {
  switch (block._type) {
    case 'adSlot':
      return <AdSlot block={block} brand={brand} />
    case 'cta':
      return <Cta block={block} brand={brand} />
    case 'topStories':
      return <TopStories block={block} brand={brand} />
    case 'publications':
      return <Publications block={block} brand={brand} />
    case 'highlights':
      return <Highlights block={block} brand={brand} />
    case 'splitLayout':
      return (
        <SplitLayout
          block={block}
          brand={brand}
          renderBlocks={(blocks) => <BlockRenderer blocks={blocks} brand={brand} />}
        />
      )
    default:
      return unknownBlock(block)
  }
}

// Typed `never`: adding a block to the page query without a case here fails the typecheck.
function unknownBlock(block: never): null {
  if (process.env.NODE_ENV !== 'production') {
    console.warn(`BlockRenderer: no component for block type "${(block as { _type?: string })._type}"`)
  }

  return null
}
