import { RecordFeature as RecordFeatureSection } from '@/components/sections/RecordFeature'
import { toHeading } from '@/sanity/heading'
import { toImage } from '@/sanity/image'

import type { BlockProps } from './types'

export function RecordFeature({ block }: BlockProps<'recordFeature'>) {
  return (
    <RecordFeatureSection
      headingId={`${block._key}-heading`}
      heading={toHeading(block.heading)}
      text={block.text?.length ? block.text : null}
      image={toImage(block.image)}
      figureValue={block.figureValue ?? ''}
      figureLabel={block.figureLabel ?? ''}
    />
  )
}
