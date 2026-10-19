import { AdSlot as AdSlotBox, type AdSlotSize } from '@/components/ui/AdSlot'
import { Container } from '@/components/ui/Container'

// Vertical rhythm per banner position, from the ClearView Home design.
const SPACINGS = {
  around: 'py-6 md:py-8 lg:py-10',
  below: 'pb-6 md:pb-8 lg:pb-10',
  belowSection: 'pb-section',
  // The sidebar has no page gutter, so this spacing is the slot's whole inset: 32 all round, 16 at the sides below md.
  aside: 'px-4 py-8 md:p-8',
  none: '',
}

export type AdSlotSpacing = keyof typeof SPACINGS

export function isAdSlotSpacing(value: unknown): value is AdSlotSpacing {
  return typeof value === 'string' && Object.hasOwn(SPACINGS, value)
}

/**
 * A banner position with its page gutter.
 *
 * Wrapped in Container. At page level that gives the page width and
 * gutter; inside a splitLayout column the column is already narrower than
 * max-w-page, so the max width is inert and only the gutter applies.
 * The `aside` spacing replaces the gutter with the sidebar's own inset.
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
  if (spacing === 'aside') {
    return (
      <div className={SPACINGS.aside}>
        <AdSlotBox size={size} label={label} />
      </div>
    )
  }

  return (
    <Container className={SPACINGS[spacing]}>
      <AdSlotBox size={size} label={label} />
    </Container>
  )
}
