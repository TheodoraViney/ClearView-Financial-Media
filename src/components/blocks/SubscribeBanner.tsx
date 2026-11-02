import { SubscribeBanner as SubscribeBannerSection } from '@/components/sections/SubscribeBanner'
import { toHeading } from '@/sanity/heading'

import { toLinkProps } from './post-card'
import type { BlockProps } from './types'

export function SubscribeBanner({ block, brand }: BlockProps<'subscribeBanner'>) {
  return (
    <SubscribeBannerSection
      heading={toHeading(block.heading)}
      description={block.description ?? null}
      cta={toLinkProps(block.cta, brand)}
    />
  )
}
