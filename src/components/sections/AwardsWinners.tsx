import { AD_SLOT_UNSET, AdSlot } from '@/components/ui/AdSlot'
import { cx } from '@/components/ui/cx'
import { Heading } from '@/components/ui/Heading'
import { Icon } from '@/components/ui/Icon'
import type { ShellVariant } from '@/components/ui/motion'
import { adPositionLabel, type AdUnitView } from '@/lib/gam'
import { type HeadingLevel } from '@/lib/headings'

// The sidebar rhythm of the Highlights blocks it stacks with (sections/Highlights.tsx), per look.
const LOOKS = {
  group: {
    body: 'px-gutter py-10 gap-8 lg:py-14 lg:gap-10 header:p-8 header:gap-8',
    headingRow: 'items-center text-heading-aside lg:h-8',
    headingText: 'text-heading-sm',
  },
  publication: {
    body: 'gap-8 px-4 py-8 md:p-8',
    headingRow: 'items-start text-accent',
    headingText: 'text-title-xl',
  },
} as const

/**
 * The sidebar's Awards Winners section (WB home v2.1 `sidebar-awards-winners`): heading with the star icon over the
 * Awards Winners MPU. The banner is the section's only content, so without a unit the whole section is hidden on the
 * live site; draft mode shows it with the placeholder.
 */
export function AwardsWinners({
  heading,
  unit,
  look = 'group',
}: {
  heading: { as: HeadingLevel; text: string } | null
  unit: AdUnitView | null
  look?: ShellVariant
}) {
  const layout = LOOKS[look]

  return (
    <section className={cx('border-t border-border', !unit && AD_SLOT_UNSET)}>
      <div className={cx('flex flex-col', layout.body)}>
        {heading && (
          <div className={cx('flex min-h-8 gap-4', layout.headingRow)}>
            <Heading as={heading.as} className={cx('flex-1 font-medium', layout.headingText)}>
              {heading.text}
            </Heading>
            <Icon name="star" className="size-8" />
          </div>
        )}
        <AdSlot size="mpu" look={look} unit={unit} label={adPositionLabel('awardsWinners')} />
      </div>
    </section>
  )
}
