import { AD_SLOT_FITS, AD_SLOT_UNSET, AdSlot } from '@/components/ui/AdSlot'
import { ArrowLink } from '@/components/ui/ArrowLink'
import { ArticleCard } from '@/components/ui/ArticleCard'
import { cx } from '@/components/ui/cx'
import type { CategoriesCardView, CategoriesView } from '@/lib/categories'
import { formatLongDate } from '@/lib/dates'
import { adPositionLabel } from '@/lib/gam'

// Banner 3 sits after the grid's first row of two cards, on every page, when more cards follow.
const BANNER_AFTER = 2

// One column below md, two from it. A card is at most (948 − 32) / 2 = 458px wide from the header breakpoint.
const CARD_SIZES = '(min-width: 75rem) 460px, (min-width: 48rem) 50vw, 100vw'

const GRID = 'grid grid-cols-1 gap-x-8 gap-y-12 md:grid-cols-2'

/**
 * The list's cards, two per row, with Banner 3 between rules after the first row; or the empty state when the
 * filters match nothing.
 */
export function ArticleGrid({
  items,
  readLabel,
  ads,
  empty,
  className,
}: {
  items: CategoriesCardView[]
  readLabel: string
  ads: CategoriesView['ads']
  /** Shown instead of the cards when there are none: the text and, while filters are set, the clear link. */
  empty: { text: string; clear: { label: string; href: string } | null } | null
  className?: string
}) {
  if (items.length === 0) {
    return empty ? (
      <div className={className}>
        <div className="flex flex-col items-start gap-4 border-t border-border py-10">
          <p className="text-base leading-copy text-grey">{empty.text}</p>
          {empty.clear && (
            <ArrowLink href={empty.clear.href} variant="accent" hover="fade">
              {empty.clear.label}
            </ArrowLink>
          )}
        </div>
      </div>
    ) : null
  }

  const first = items.slice(0, BANNER_AFTER)
  const rest = items.slice(BANNER_AFTER)

  return (
    <div className={cx('@container flex flex-col gap-12', className)}>
      <Cards items={first} readLabel={readLabel} />
      {rest.length > 0 && (
        // Hidden with its rules where the column is too narrow for a leaderboard (`AD_SLOT_FITS`), or with no unit set.
        <div
          role="complementary"
          aria-label="Advertisement, in content"
          className={cx('border-y border-border py-4', ads.banner3 ? AD_SLOT_FITS.leaderboard : AD_SLOT_UNSET)}
        >
          <AdSlot size="leaderboard" look="publication" unit={ads.banner3} label={adPositionLabel('banner3')} className="mx-auto w-full max-w-182" />
        </div>
      )}
      {rest.length > 0 && <Cards items={rest} readLabel={readLabel} />}
    </div>
  )
}

function Cards({ items, readLabel }: { items: CategoriesCardView[]; readLabel: string }) {
  return (
    <ul className={GRID}>
      {items.map((item) => {
        const date = formatLongDate(item.publishedAt)

        return (
          <li key={item.key} className="flex min-w-0">
            <ArticleCard
              variant="grid"
              href={item.href}
              title={item.title}
              image={item.image}
              sizes={CARD_SIZES}
              readLabel={readLabel}
              meta={[
                ...(item.category ? [item.category.label] : []),
                ...(date && item.publishedAt ? [<time key="date" dateTime={item.publishedAt}>{date}</time>] : []),
              ]}
              className="w-full"
            />
          </li>
        )
      })}
    </ul>
  )
}
