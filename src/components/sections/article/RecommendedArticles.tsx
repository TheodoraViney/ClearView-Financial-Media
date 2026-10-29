import { ArticleCard } from '@/components/ui/ArticleCard'
import type { ArticleCardView } from '@/lib/article'
import { formatMediumDate } from '@/lib/dates'

// One column on mobile, two on tablet, three from the header breakpoint. A card is at most 300px wide on desktop.
const CARD_SIZES = '(min-width: 75rem) 300px, (min-width: 48rem) 50vw, 100vw'

export function RecommendedArticles({ heading, items }: { heading: string; items: ArticleCardView[] }) {
  return (
    <section aria-labelledby="recommended-articles-heading" className="flex flex-col gap-6">
      <h2 id="recommended-articles-heading" className="text-heading-fixed font-medium">
        {heading}
      </h2>
      <ul className="grid grid-cols-1 gap-8 md:grid-cols-2 header:grid-cols-3">
        {items.map((item) => {
          const date = formatMediumDate(item.publishedAt)

          return (
            <li key={item.key} className="flex min-w-0">
              <ArticleCard
                variant="stacked"
                href={item.href}
                title={item.title}
                image={item.image}
                sizes={CARD_SIZES}
                meta={[
                  ...(item.label ? [item.label] : []),
                  ...(date && item.publishedAt ? [<time key="date" dateTime={item.publishedAt}>{date}</time>] : []),
                ]}
                className="min-w-0 flex-1"
              />
            </li>
          )
        })}
      </ul>
    </section>
  )
}
