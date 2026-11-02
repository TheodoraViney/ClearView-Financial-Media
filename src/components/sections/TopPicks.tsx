import { ArticleCard } from '@/components/ui/ArticleCard'
import { type MediaImage } from '@/components/ui/Media'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { type HeadingLevel } from '@/lib/headings'

export type TopPickItem = {
  key: string
  href: string
  title: string
  category: string | null
  date: string | null
  summary: string | null
  image: MediaImage | null
}

export type TopPicksProps = {
  heading: { as: HeadingLevel; text: string } | null
  link: { href: string; label: string } | null
  items: TopPickItem[]
}

// 16:10 cards, cropped at the sides of a 16:9 image (height × 16/9): from 1200 a third of the lower part
// (≤ 427 wide at 1440) → 427 / 1.6 × 16/9 ≈ 474 → 480px; from md half the width → 50vw × 1.11 ≈ 56vw; below, full width → 112vw.
const CARD_SIZES = '(min-width: 75rem) 480px, (min-width: 48rem) 56vw, 112vw'

/**
 * Publication home "Top Picks" (WB v2.0 `top-picks`): section header, then pick cards 3 across from 1200, 2 from md,
 * 1 below, 32 apart. Lower-part padding: 16 above, 56 below (48 on mobile). Renders nothing without posts.
 */
export function TopPicks({ heading, link, items }: TopPicksProps) {
  if (items.length === 0) {
    return null
  }

  return (
    <section className="mx-auto flex w-full max-w-page flex-col gap-6 px-side-lower pt-4 pb-12 md:pb-14">
      <SectionHeading heading={heading} link={link} />
      <ul className="grid gap-8 md:grid-cols-2 header:grid-cols-3">
        {items.map((item) => (
          <li key={item.key} className="min-w-0">
            <ArticleCard
              variant="pick"
              href={item.href}
              title={item.title}
              meta={[item.category, item.date].filter((part): part is string => Boolean(part))}
              metaAccent={Boolean(item.category)}
              summary={item.summary}
              image={item.image}
              sizes={CARD_SIZES}
            />
          </li>
        ))}
      </ul>
    </section>
  )
}
