import { cx } from '@/components/ui/cx'
import { Pagination } from '@/components/ui/Pagination'
import type { ArticleListingView } from '@/lib/categories'

import { ArticleGrid } from './ArticleGrid'
import { CategoryFilters } from './CategoryFilters'
import { FeaturedStory } from './FeaturedStory'
import { PAD, SECTION } from './layout'

/**
 * The Categories page's articles list, in the main column under the page heading: the filter bar (sticky, 16px under
 * the heading), the featured story (page 1), the card grid with Banner 3 (or the empty state) and pagination. A
 * fragment: its parts are the column's own rows, so the bar sticks for the whole column.
 */
export function ArticleListing({ view }: { view: ArticleListingView }) {
  const { labels } = view
  const empty = !view.featured && view.items.length === 0

  return (
    <>
      <CategoryFilters filters={view.filters} state={view.state} labels={labels} className={`${PAD} mt-4`} />

      {view.featured && (
        <div className={`${PAD} mt-6 md:mt-8`}>
          <FeaturedStory story={view.featured} readLabel={labels.readArticleLabel} />
        </div>
      )}

      <ArticleGrid
        items={view.items}
        readLabel={labels.readArticleLabel}
        banner3={view.banner3}
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
          pages={view.pagination.pages}
          previousHref={view.pagination.previousHref}
          nextHref={view.pagination.nextHref}
          previousLabel={labels.previousLabel}
          nextLabel={labels.nextLabel}
          className={cx('border-t border-border pt-8', SECTION)}
        />
      </div>
    </>
  )
}
