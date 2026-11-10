import { AwardsWinners as AwardsWinnersSection } from '@/components/sections/AwardsWinners'
import type { AdUnitView } from '@/lib/gam'
import { toHeading } from '@/sanity/heading'

import type { BlockProps } from './types'

export function AwardsWinners({ block, brand, unit }: BlockProps<'awardsWinners'> & { unit: AdUnitView | null }) {
  return (
    <AwardsWinnersSection
      heading={toHeading(block.heading)}
      unit={unit}
      look={brand === 'clearview' ? 'group' : 'publication'}
    />
  )
}
