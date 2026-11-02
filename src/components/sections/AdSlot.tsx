import { AdSlot as AdSlotBox, type AdSlotSize } from '@/components/ui/AdSlot'
import { Container } from '@/components/ui/Container'
import { cx } from '@/components/ui/cx'
import type { ShellVariant } from '@/components/ui/motion'

// Vertical rhythm per banner position, from the ClearView Home design and the publication home designs.
const SPACINGS = {
  around: 'py-6 md:py-8 lg:py-10',
  below: 'pb-6 md:pb-8 lg:pb-10',
  belowSection: 'pb-section',
  // The sidebar has no page gutter, so this spacing is the slot's whole inset: 32 all round, 16 at the sides below md.
  aside: 'px-4 py-8 md:p-8',
  // Publication Banner 1: space above only (24 / 32 / 40 from 1200), the lead stories bring their own.
  top: 'pt-6 md:pt-8 header:pt-10',
  // Publication Banner 3: a rule above, 24 above and below on every breakpoint.
  divided: 'border-t border-border py-6',
  none: '',
}

export type AdSlotSpacing = keyof typeof SPACINGS

export function isAdSlotSpacing(value: unknown): value is AdSlotSpacing {
  return typeof value === 'string' && Object.hasOwn(SPACINGS, value)
}

/**
 * A banner position with its page gutter.
 *
 * `group` (ClearView): wrapped in Container. At page level that gives the page width and gutter; inside a splitLayout
 * column the column is already narrower than max-w-page, so the max width is inert and only the gutter applies.
 * `publication`: the publication page padding instead: `top` (Banner 1, in the main column) takes the top part's
 * 16 / 32 / 64, every other spacing the lower part's 16 / 32 / 48 (Banners 3 and 4 run full width under the columns).
 * The `aside` spacing replaces the gutter with the sidebar's own inset.
 */
export function AdSlot({
  size,
  label,
  spacing,
  look = 'group',
}: {
  size: AdSlotSize
  label?: string
  spacing: AdSlotSpacing
  look?: ShellVariant
}) {
  if (spacing === 'aside') {
    return (
      <div className={SPACINGS.aside}>
        <AdSlotBox size={size} label={label} look={look} />
      </div>
    )
  }

  if (look === 'publication') {
    return (
      <div
        className={cx(
          'mx-auto w-full max-w-page',
          spacing === 'top' ? 'px-side' : 'px-side-lower',
          SPACINGS[spacing],
        )}
      >
        <AdSlotBox size={size} label={label} look={look} />
      </div>
    )
  }

  return (
    <Container className={SPACINGS[spacing]}>
      <AdSlotBox size={size} label={label} />
    </Container>
  )
}
