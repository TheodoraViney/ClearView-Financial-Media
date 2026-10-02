import { AdSlot as AdSlotBox, type AdSlotSize } from '@/components/ui/AdSlot'
import { Container } from '@/components/ui/Container'

// Vertical rhythm per banner position, from the ClearView Home design.
const SPACINGS = {
  around: 'py-6 md:py-8 lg:py-10',
  below: 'pb-6 md:pb-8 lg:pb-10',
  belowSection: 'pb-section',
  none: '',
}

export type AdSlotSpacing = keyof typeof SPACINGS

export function isAdSlotSpacing(value: unknown): value is AdSlotSpacing {
  return typeof value === 'string' && Object.hasOwn(SPACINGS, value)
}

/**
 * A banner position with its page gutter.
 *
 * Always wrapped in Container. At page level that gives the page width and
 * gutter; inside a splitLayout column the column is already narrower than
 * max-w-page, so the max width is inert and only the gutter applies.
 */
export function AdSlot({
  size,
  label,
  spacing,
}: {
  size: AdSlotSize
  label?: string
  spacing: AdSlotSpacing
}) {
  return (
    <Container className={SPACINGS[spacing]}>
      <AdSlotBox size={size} label={label} />
    </Container>
  )
}
