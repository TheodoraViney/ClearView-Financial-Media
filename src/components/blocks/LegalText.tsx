import { LegalText as LegalTextSection } from '@/components/sections/LegalText'
import { headingAnchors } from '@/lib/heading-anchors'

import type { BlockProps } from './types'

/** Legal text: breadcrumb, H1, introduction, table of contents from the body's H2 and H3, the body. Text keeps stega. */
export function LegalText({ block }: BlockProps<'legalText'>) {
  const { ids, items } = headingAnchors(block.body)

  return (
    <LegalTextSection
      headingId={`${block._key}-heading`}
      breadcrumb={[{ label: block.breadcrumbHomeLabel ?? '', href: '/' }, { label: block.breadcrumbLabel ?? '' }]}
      title={block.title ?? ''}
      intro={block.intro?.length ? block.intro : null}
      tocLabel={block.tocLabel ?? ''}
      toc={items}
      anchors={ids}
      body={block.body?.length ? block.body : null}
    />
  )
}
