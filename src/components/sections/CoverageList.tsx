import { RichText, type RichTextValue } from '@/components/sections/article/ArticleBody'
import { Container } from '@/components/ui/Container'
import { Heading } from '@/components/ui/Heading'
import { Icon } from '@/components/ui/Icon'
import type { CoverageListIcon } from '@/lib/coverage-list'
import { type HeadingValue } from '@/sanity/heading'

export type CoverageListItem = {
  key: string
  icon: CoverageListIcon | null
  title: string
  description: RichTextValue | null
}

/**
 * Intro beside a headed list of topics (design wb-g-about v1.1 "global view"), 48 / 64 / 80 above and below.
 * - From the header breakpoint (1200): 12 columns, gap 32; intro (heading + text, gap 24) in columns 1–4, the list in
 *   columns 6–12 with 8 above and below.
 * - Below: stacked, gap 32 on mobile and 40 on tablet (as the design).
 * The list heading has a rule under it (16 below the text), then the topics 32 below: 2 columns from md (gap 40 rows,
 * 32 columns, 24 right padding per topic), 1 on mobile. Each topic: 48px accent icon, 16 gap, title and text (gap 12).
 */
export function CoverageList({
  headingId,
  heading,
  text,
  listHeading,
  items,
}: {
  headingId: string
  heading: HeadingValue | null
  text: string
  listHeading: HeadingValue | null
  items: CoverageListItem[]
}) {
  return (
    <Container className="py-12 md:py-16 header:px-16 header:py-20">
      <section
        aria-labelledby={heading ? headingId : undefined}
        className="grid gap-8 md:gap-10 header:grid-cols-12 header:gap-8"
      >
        <div className="flex min-w-0 flex-col gap-6 header:col-span-4">
          {heading && (
            <Heading as={heading.as} id={headingId} className="text-heading-section font-medium text-pretty">
              {heading.text}
            </Heading>
          )}
          {text && <p className="text-base leading-copy text-pretty">{text}</p>}
        </div>

        <div className="flex min-w-0 flex-col gap-8 header:col-span-7 header:col-start-6 header:py-2">
          {listHeading && (
            <Heading as={listHeading.as} className="border-b border-border pb-4 text-title-lg font-medium">
              {listHeading.text}
            </Heading>
          )}
          {items.length > 0 && (
            <ul className="grid gap-x-8 gap-y-10 md:grid-cols-2">
              {items.map((item) => (
                <li key={item.key} className="flex min-w-0 flex-col gap-4 md:pr-6">
                  {item.icon && <Icon name={item.icon} className="size-12 text-accent" />}
                  <div className="flex flex-col gap-3">
                    <p className="text-base leading-title font-medium">{item.title}</p>
                    {item.description && <RichText value={item.description} className="text-grey" />}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </Container>
  )
}
