import { stegaClean } from 'next-sanity'

import { SubscribeBanner as SubscribeBannerSection } from '@/components/sections/SubscribeBanner'
import { toHeading } from '@/sanity/heading'

import type { BlockProps } from './types'

export function SubscribeBanner({ block }: BlockProps<'subscribeBanner'>) {
  // The old link's label until every banner has the new label field.
  const buttonLabel = [block.buttonLabel, block.cta?.label].find((label) => stegaClean(label)?.trim()) ?? null

  return (
    <SubscribeBannerSection
      heading={toHeading(block.heading)}
      description={block.description ?? null}
      buttonLabel={buttonLabel}
    />
  )
}
