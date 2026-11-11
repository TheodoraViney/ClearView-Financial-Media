import { MostRead } from '@/components/sections/MostRead'
import { AD_SLOT_FITS, AD_SLOT_UNSET, AdSlot } from '@/components/ui/AdSlot'
import { cx } from '@/components/ui/cx'
import type { CategoriesView } from '@/lib/categories'
import { adPositionLabel } from '@/lib/gam'

import { ArticleGrid } from './ArticleGrid'
import { CategoriesHeader } from './CategoriesHeader'
import { CategoryFilters } from './CategoryFilters'
import { FeaturedStory } from './FeaturedStory'
import { Pagination } from './Pagination'
import { RelatedTopics } from './RelatedTopics'

// Side padding of the main column: 16 / 32, and 64 from the header breakpoint (the design's desktop starts at 1200).
const PAD = 'px-gutter header:px-16'

// Space between the main column's blocks: 40 on mobile, 64 from md (the design's section margin).
const SECTION = 'mt-10 md:mt-16'

/**
 * The Categories page (the articles list), as the article page: from the header breakpoint the main column beside a
 * 364px right rail, below it the rail under the column. Main column: Top banner, header, featured story (page 1),
 * filters, the card grid with Banner 3 (or the empty state), pagination and Explore related topics. Rail: Side banner
 * and Most read, which sticks 32px under the header on desktop.
 */
export function CategoriesPage({ view }: { view: CategoriesView }) {
  const { labels } = view
  const empty = !view.featured && view.items.length === 0

  return (
    <main className="mx-auto w-full max-w-page header:grid header:grid-cols-article">
      {/* The column divider is the main column's right border: on the rail it would take 1px of the 300px banner. */}
      <div className={cx('flex min-w-0 flex-col header:border-r header:border-border', !view.related && 'pb-16 md:pb-20')}>
        {/* Hidden with its spacing where the column is too narrow for a leaderboard (`AD_SLOT_FITS`), or with no unit. */}
        <div className={cx(`@container ${PAD}`, !view.ads.top && AD_SLOT_UNSET)}>
          <div
            role="complementary"
            aria-label="Advertisement, top"
            className={cx('pt-6 md:pt-10', view.ads.top && AD_SLOT_FITS.leaderboard)}
          >
            <AdSlot size="leaderboard" look="publication" unit={view.ads.top} label={adPositionLabel('top')} />
          </div>
        </div>

        <CategoriesHeader
          title={view.title}
          intro={view.intro}
          breadcrumb={view.breadcrumb}
          className={`${PAD} pt-8 md:pt-10`}
        />

        {view.featured && (
          <div className={`${PAD} mt-8 md:mt-10`}>
            <FeaturedStory story={view.featured} readLabel={labels.readArticleLabel} />
          </div>
        )}

        <div className={`${PAD} ${SECTION}`}>
          <CategoryFilters filters={view.filters} state={view.state} labels={labels} className="border-t border-border pt-10" />
        </div>

        <ArticleGrid
          items={view.items}
          readLabel={labels.readArticleLabel}
          ads={view.ads}
          // Page 1 with only the featured story has no cards and no empty state.
          empty={
            empty
              ? {
                  text: labels.emptyStateText,
                  clear: view.filters.clearHref ? { label: labels.clearFiltersLabel, href: view.filters.clearHref } : null,
                }
              : null
          }
          className={`${PAD} pt-10`}
        />

        <div className={PAD}>
          <Pagination
            pagination={view.pagination}
            previousLabel={labels.previousLabel}
            nextLabel={labels.nextLabel}
            className={SECTION}
          />
        </div>

        {view.related && (
          <RelatedTopics
            heading={view.related.heading}
            items={view.related.items}
            className={`mt-16 border-t border-border ${PAD} pt-10 pb-16 md:mt-20 md:pb-20`}
          />
        )}
      </div>

      {/* Most read sticks within the rail, which stretches to the main column's height. */}
      <aside
        aria-label="Sidebar"
        className="flex flex-col items-start gap-8 border-t border-border px-gutter pt-10 pb-16 header:border-t-0 header:p-8"
      >
        {/* The sidebar is already a complementary landmark: its banner gets no landmark of its own. */}
        <div className={cx('w-full', !view.ads.side && AD_SLOT_UNSET)}>
          <AdSlot size="mpu" look="publication" unit={view.ads.side} label={adPositionLabel('side')} />
        </div>
        {view.mostRead && (
          <div className="w-75 max-w-full header:sticky header:top-rail">
            <MostRead title={view.mostRead.title} items={view.mostRead.items} />
          </div>
        )}
      </aside>
    </main>
  )
}
