import { stegaClean } from 'next-sanity'

import { PageHero as PageHeroSection } from '@/components/sections/PageHero'

import type { BlockProps } from './types'

/** The page heading block: Home / current label, the H1 and an optional intro. All visible text is CMS copy. */
export function PageHero({ block }: BlockProps<'pageHero'>) {
  return (
    <PageHeroSection
      breadcrumb={[{ label: block.breadcrumbHomeLabel ?? '', href: '/' }, { label: block.breadcrumbLabel ?? '' }]}
      title={block.title ?? ''}
      intro={stegaClean(block.intro)?.trim() ? (block.intro ?? null) : null}
    />
  )
}
