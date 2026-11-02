import { Button } from '@/components/ui/Button'
import { cx } from '@/components/ui/cx'
import { Heading } from '@/components/ui/Heading'
import { Icon } from '@/components/ui/Icon'
import { type MediaImage } from '@/components/ui/Media'
import { ListLink } from '@/components/ui/ListLink'
import type { ShellVariant } from '@/components/ui/motion'
import { PromoRow } from '@/components/ui/PromoRow'
import { type HeadingLevel } from '@/lib/headings'

export type HighlightsItem = {
  key: string
  title: string
  href: string | null
  meta: string[]
}

export type HighlightsPromo = {
  title: string
  description?: string
  image?: MediaImage
  href: string | null
  downloadHref: string | null
  report: boolean
}

export type HighlightsVariant = 'awards' | 'events' | 'research'

export type HighlightsProps = {
  variant: HighlightsVariant
  /** `group` (ClearView, the default) or `publication` (WB / WBA / FWR sidebar). */
  look?: ShellVariant
  heading: { as: HeadingLevel; text: string } | null
  items: HighlightsItem[]
  button: { label: string; href: string } | null
  promo: HighlightsPromo | null
}

// Surface, icon and spacing per block, as in the ClearView design. Gaps: heading to content, then list to button.
// All three blocks share one rhythm: 32 under the heading (40 from lg to 1200) and 32 from list to button (gap-6 plus pb-2).
const VARIANTS = {
  awards: {
    tone: 'inverse',
    icon: 'star',
    root: 'bg-light-blue-grey',
    heading: 'text-white',
    promo: '',
  },
  events: {
    tone: 'default',
    icon: 'public',
    root: 'border-t border-border',
    heading: 'text-heading-aside',
    promo: '',
  },
  research: {
    tone: 'default',
    icon: 'document',
    root: 'border-t border-border',
    heading: 'text-heading-aside',
    // Stacked on tablet and mobile the last row closes with a rule; the desktop file has none.
    promo: 'border-b border-border lg:border-b-0',
  },
} as const

// The layout per look. ClearView: below 1200 the blocks stack with the page gutter and from lg to 1200 the list runs in
// columns; beside the main column from 1200 they keep their content height, the button right under the list, and any
// spare height stays at the bottom of the sidebar.
// Publications (WB v2.0 sidebar): light on every source, heading 26/32 in the accent with the icon top-aligned
// (the design system's card title row rule), 32 padding (16 at the sides below md), one column of items on every
// breakpoint, the full-width button; gaps 32 + 24 on all brands; 180ms ease-out hovers.
const LOOKS = {
  group: {
    body: 'px-gutter py-10 gap-8 lg:py-14 lg:gap-10 header:p-8 header:gap-8',
    headingRow: 'items-center lg:h-8',
    headingText: 'text-heading-sm',
    list: 'gap-5 lg:grid lg:grid-cols-cards lg:gap-8 header:flex header:gap-5',
    button: 'self-stretch lg:min-w-70 lg:self-start header:min-w-0 header:self-stretch',
    motion: 'responsive',
  },
  publication: {
    body: 'gap-8 px-4 py-8 md:p-8',
    headingRow: 'items-start',
    headingText: 'text-title-xl',
    list: 'gap-5',
    button: 'self-stretch',
    motion: 'out',
  },
} as const

/**
 * Hover motion follows the design per breakpoint: on ClearView the responsive file below lg, the desktop file from lg
 * (motion="responsive"); on the publications 180ms ease-out everywhere.
 * A sidebar block (Awards, Summits & events or Research): heading with icon, its items, a "View all" button and an optional promo row.
 */
export function Highlights({ variant, look = 'group', heading, items, button, promo }: HighlightsProps) {
  const publication = look === 'publication'
  const styles = VARIANTS[variant]
  const layout = LOOKS[look]
  // Publication sidebars are light on every source.
  const tone = publication ? 'default' : styles.tone

  return (
    <section className={cx('flex flex-col', publication ? 'border-t border-border' : styles.root)}>
      <div className={cx('flex flex-col', layout.body)}>
        {/* Tablet and mobile let a wrapped heading grow the row; the ClearView desktop file (from lg) fixes it at 32px. */}
        {heading && (
          <div className={cx('flex min-h-8 gap-4', layout.headingRow, publication ? 'text-accent' : styles.heading)}>
            <Heading as={heading.as} className={cx('flex-1 font-medium', layout.headingText)}>
              {heading.text}
            </Heading>
            <Icon name={styles.icon} className="size-8" />
          </div>
        )}

        {(items.length > 0 || button) && (
          <div className="flex flex-col gap-6">
            {items.length > 0 && (
              <ul className={cx('flex flex-col pb-2', layout.list)}>
                {items.map((item) => (
                  <li key={item.key}>
                    <ListLink href={item.href} title={item.title} meta={item.meta} variant={tone} motion={layout.motion} />
                  </li>
                ))}
              </ul>
            )}

            {button && (
              <Button
                href={button.href}
                variant={tone === 'inverse' ? 'outline-inverse' : 'outline'}
                arrow
                motion={layout.motion}
                className={layout.button}
              >
                {button.label}
              </Button>
            )}
          </div>
        )}
      </div>

      {promo && (
        <PromoRow
          href={promo.href}
          title={promo.title}
          description={promo.description}
          image={promo.image}
          report={promo.report}
          downloadHref={promo.downloadHref ?? undefined}
          variant={tone}
          motion={layout.motion}
          className={styles.promo}
        />
      )}
    </section>
  )
}
