import { ListLink } from '@/components/ui/ListLink'
import type { ArticleCardView } from '@/lib/article'
import { formatMediumDate } from '@/lib/dates'

// The editor's Most read list in the right rail: title, then topic and date.
export function MostRead({ title, items }: { title: string; items: ArticleCardView[] }) {
  return (
    <section aria-labelledby="most-read-heading" className="flex w-full flex-col gap-6">
      <h2 id="most-read-heading" className="text-title-lg leading-tight font-medium">
        {title}
      </h2>
      <ol className="flex flex-col border-t border-border">
        {items.map((item) => {
          const date = formatMediumDate(item.publishedAt)

          return (
            <li key={item.key} className="border-b border-border last:border-b-0">
              <ListLink
                variant="accent"
                href={item.href}
                title={item.title}
                meta={[
                  ...(item.label ? [item.label] : []),
                  ...(date && item.publishedAt ? [<time key="date" dateTime={item.publishedAt}>{date}</time>] : []),
                ]}
                className="py-4"
              />
            </li>
          )
        })}
      </ol>
    </section>
  )
}
