import { BriefRow } from '@/components/ui/BriefRow'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { type HeadingLevel } from '@/lib/headings'

export type PostBriefItem = {
  key: string
  href: string | null
  title: string
  meta: string[]
  text: string | null
}

export type PostBriefsProps = {
  heading: { as: HeadingLevel; text: string } | null
  link: { href: string; label: string } | null
  items: PostBriefItem[]
}

/**
 * Publication home "News in Brief" (WB v2.0 `news-in-brief-list`): section header, then brief rows under a rule.
 * Rule above, 40 / 56 padding (48 below on mobile). Renders nothing without posts.
 */
export function PostBriefs({ heading, link, items }: PostBriefsProps) {
  if (items.length === 0) {
    return null
  }

  return (
    <section className="flex flex-col gap-6 border-t border-border px-side pt-10 pb-12 md:pb-14">
      <SectionHeading heading={heading} link={link} />
      <ul className="border-t border-border">
        {items.map((item) => (
          <BriefRow key={item.key} href={item.href} title={item.title} meta={item.meta} text={item.text} />
        ))}
      </ul>
    </section>
  )
}
