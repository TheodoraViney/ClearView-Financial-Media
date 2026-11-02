import { SectionHeading } from '@/components/ui/SectionHeading'
import { TextCard } from '@/components/ui/TextCard'
import { type HeadingLevel } from '@/lib/headings'

export type PostCardItem = {
  key: string
  href: string
  title: string
  category: string | null
  date: string | null
  summary: string | null
}

export type PostCardsProps = {
  heading: { as: HeadingLevel; text: string } | null
  link: { href: string; label: string } | null
  items: PostCardItem[]
}

/**
 * Publication home "News Analysis" (WB v2.0 `news-in-brief`): section header, then text cards 3 across from 1200,
 * 2 from md, 1 below, 32 apart. Rule above, 40 / 56 padding (48 below on mobile). Renders nothing without posts.
 */
export function PostCards({ heading, link, items }: PostCardsProps) {
  if (items.length === 0) {
    return null
  }

  return (
    <section className="flex flex-col gap-6 border-t border-border px-side pt-10 pb-12 md:pb-14">
      <SectionHeading heading={heading} link={link} />
      <ul className="grid gap-8 md:grid-cols-2 header:grid-cols-3">
        {items.map((item) => (
          <li key={item.key} className="min-w-0">
            <TextCard
              href={item.href}
              title={item.title}
              category={item.category}
              date={item.date}
              summary={item.summary}
            />
          </li>
        ))}
      </ul>
    </section>
  )
}
