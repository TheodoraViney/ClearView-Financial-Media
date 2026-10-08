import { Button } from '@/components/ui/Button'
import { cx } from '@/components/ui/cx'
import { Heading } from '@/components/ui/Heading'
import { Icon } from '@/components/ui/Icon'
import { type MediaImage } from '@/components/ui/Media'
import { ListLink } from '@/components/ui/ListLink'
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
  heading: { as: HeadingLevel; text: string } | null
  items: HighlightsItem[]
  button: { label: string; href: string } | null
  promo: HighlightsPromo | null
}

// Surface, icon and spacing per block, as in the design. Gaps: heading to content, then list to button.
// All three blocks share one rhythm: 32 under the heading (40 from lg to xl) and 32 from list to button (gap-6 plus pb-2).
const VARIANTS = {
  awards: {
    tone: 'inverse',
    icon: 'star',
    root: 'bg-light-blue-grey',
    heading: 'text-white',
    body: 'gap-8 lg:gap-10 xl:gap-8',
    stack: 'gap-6',
    list: 'pb-2',
    promo: '',
  },
  events: {
    tone: 'default',
    icon: 'public',
    root: 'border-t border-border',
    heading: 'text-heading-aside',
    body: 'gap-8 lg:gap-10 xl:gap-8',
    stack: 'gap-6',
    list: 'pb-2',
    promo: '',
  },
  research: {
    tone: 'default',
    icon: 'document',
    root: 'border-t border-border',
    heading: 'text-heading-aside',
    body: 'gap-8 lg:gap-10 xl:gap-8',
    stack: 'gap-6',
    list: 'pb-2',
    // Stacked on tablet and mobile the last row closes with a rule; the desktop file has none.
    promo: 'border-b border-border lg:border-b-0',
  },
} as const

/**
 * Hover motion follows the design per breakpoint: the responsive file below lg, the desktop file from lg (motion="responsive").
 * A sidebar block (Awards, Summits & events or Research): heading with icon, up to three items, a "View all" button and a promo row.
 * Beside the main column from xl the three blocks share its height; below xl they stack, and from lg to xl the list runs in columns.
 */
export function Highlights({ variant, heading, items, button, promo }: HighlightsProps) {
  const styles = VARIANTS[variant]

  return (
    <section className={cx('flex flex-col xl:flex-1', styles.root)}>
      <div
        className={cx(
          'flex flex-col px-gutter py-10 lg:py-14 xl:flex-1 xl:p-8',
          styles.body,
        )}
      >
        {/* Tablet and mobile let a wrapped heading grow the row; the desktop file (from lg) fixes it at 32px. */}
        {heading && (
          <div className={cx('flex min-h-8 items-center gap-4 lg:h-8', styles.heading)}>
            <Heading as={heading.as} className="flex-1 text-heading-sm font-medium">
              {heading.text}
            </Heading>
            <Icon name={styles.icon} className="size-8" />
          </div>
        )}

        {(items.length > 0 || button) && (
          <div className={cx('flex flex-col xl:flex-1', styles.stack)}>
            {items.length > 0 && (
              <ul
                className={cx(
                  'flex flex-col gap-5 lg:grid lg:grid-cols-cards lg:gap-8 xl:flex xl:flex-1 xl:gap-5',
                  styles.list,
                )}
              >
                {items.map((item) => (
                  <li key={item.key}>
                    <ListLink href={item.href} title={item.title} meta={item.meta} variant={styles.tone} motion="responsive" />
                  </li>
                ))}
              </ul>
            )}

            {button && (
              <Button
                href={button.href}
                variant={styles.tone === 'inverse' ? 'outline-inverse' : 'outline'}
                arrow
                motion="responsive"
                className="self-stretch lg:min-w-70 lg:self-start xl:min-w-0 xl:self-stretch"
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
          variant={styles.tone}
          motion="responsive"
          className={styles.promo}
        />
      )}
    </section>
  )
}
