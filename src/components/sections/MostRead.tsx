import { Heading } from '@/components/ui/Heading'
import { ListLink } from '@/components/ui/ListLink'
import type { ArticleCardView } from '@/lib/article'
import { formatMediumDate } from '@/lib/dates'
import type { HeadingLevel } from '@/lib/headings'

// The editor's Most read list in the right rail: title, then topic and date.
// Opt-in: `showMeta={false}` lists titles only and `headingAs` sets the heading level from a CMS heading field
// (research report rail, most-read-list as drawn).
export function MostRead({
  title,
  items,
  showMeta = true,
  headingAs = 'h2',
}: {
  title: string
  items: ArticleCardView[]
  showMeta?: boolean
  headingAs?: HeadingLevel
}) {
  return (
    <section aria-labelledby="most-read-heading" className="flex w-full flex-col gap-6">
      <Heading as={headingAs} id="most-read-heading" className="text-title-lg leading-tight font-medium">
        {title}
      </Heading>
      <ol className="flex flex-col border-t border-border">
        {items.map((item) => {
          const date = formatMediumDate(item.publishedAt)

          return (
            <li key={item.key} className="border-b border-border last:border-b-0">
              <ListLink
                variant="accent"
                href={item.href}
                title={item.title}
                meta={showMeta ? [
                  ...(item.label ? [item.label] : []),
                  ...(date && item.publishedAt ? [<time key="date" dateTime={item.publishedAt}>{date}</time>] : []),
                ] : []}
                className="py-4"
              />
            </li>
          )
        })}
      </ol>
    </section>
  )
}
