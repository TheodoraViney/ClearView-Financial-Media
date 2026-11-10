import { AD_SLOT_FITS, AD_SLOT_UNSET, AdSlot as AdSlotBox, type AdSlotSize } from '@/components/ui/AdSlot'
import { Container } from '@/components/ui/Container'
import { cx } from '@/components/ui/cx'
import type { ShellVariant } from '@/components/ui/motion'
import type { AdUnitView } from '@/lib/gam'

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

/**
 * What a hidden position (no unit set, or too narrow for its banner) leaves behind: one gap instead of its two,
 * so its neighbours neither touch nor sit around an empty band. Only spacings that separate two neighbours on both
 * sides leave one; the others sit next to a neighbour that brings its own spacing (a section's padding, the lead
 * stories' top space), so they leave nothing.
 */
const HIDDEN_GAPS = {
  around: 'pt-6 md:pt-8 lg:pt-10',
  below: '',
  belowSection: '',
  aside: '',
  top: '',
  divided: 'pt-6',
  none: '',
} satisfies Record<AdSlotSpacing, string>

/** Where the position hides at the container's width, its gap shows instead (`AD_SLOT_FITS`). */
const GAP_WHEN_NARROW = 'hidden @max-leaderboard:block'

/**
 * A banner position with its page gutter.
 *
 * `group` (ClearView): wrapped in Container. At page level that gives the page width and gutter; inside a splitLayout
 * column the column is already narrower than max-w-page, so the max width is inert and only the gutter applies.
 * `publication`: the publication page padding instead: `top` (Banner 1, in the main column) takes the top part's
 * 16 / 32 / 64, every other spacing the lower part's 16 / 32 / 48 (Banners 3 and 4 run full width under the columns).
 * The `aside` spacing replaces the gutter with the sidebar's own inset.
 *
 * The gutter sits on an `@container`, the vertical spacing on the element inside it, so a 728 × 90 position too
 * narrow for its banner hides together with its spacing (`AD_SLOT_FITS`). With no unit set the position is hidden on
 * the live site (`AD_SLOT_UNSET`). Either way it leaves its `HIDDEN_GAPS` gap behind.
 */
export function AdSlot({
  size,
  label,
  unit,
  spacing,
  look = 'group',
}: {
  size: AdSlotSize
  label?: string
  unit?: AdUnitView | null
  spacing: AdSlotSpacing
  look?: ShellVariant
}) {
  if (spacing === 'aside') {
    return (
      <div className={cx(SPACINGS.aside, !unit && AD_SLOT_UNSET)}>
        <AdSlotBox size={size} label={label} unit={unit} look={look} />
      </div>
    )
  }

  const gap = HIDDEN_GAPS[spacing]
  const fits = AD_SLOT_FITS[size]

  // The banner with its spacing, and the gap that replaces it on the live site when it is hidden.
  const content = (
    <>
      <div className={cx(SPACINGS[spacing], unit ? fits : AD_SLOT_UNSET)}>
        <AdSlotBox size={size} label={label} unit={unit} look={look} />
      </div>
      {gap && !unit && <div aria-hidden className={cx(gap, 'in-data-preview:hidden')} />}
      {gap && unit && fits && <div aria-hidden className={cx(gap, GAP_WHEN_NARROW)} />}
    </>
  )

  if (look === 'publication') {
    return (
      <div className={cx('@container mx-auto w-full max-w-page', spacing === 'top' ? 'px-side' : 'px-side-lower')}>
        {content}
      </div>
    )
  }

  return <Container className="@container">{content}</Container>
}
