import { Container } from '@/components/ui/Container'
import { Heading } from '@/components/ui/Heading'
import { type HeadingValue } from '@/sanity/heading'

export type NumberedListItem = { key: string; title: string; description: string }

/**
 * A small grey heading over numbered points (01, 02 …), under a rule: 40 / 56 / 64 above, 24 inside. Grid of 1 / 2 / 4
 * columns (4 from 1200), gaps 24 × 32. The numbers are decorative: the `ol` already numbers for assistive tech.
 */
export function NumberedList({
  headingId,
  heading,
  items,
}: {
  headingId: string
  heading: HeadingValue | null
  items: NumberedListItem[]
}) {
  if (items.length === 0) {
    return null
  }

  return (
    <Container className="mt-10 md:mt-14 header:mt-16 header:px-16">
      <section aria-labelledby={heading ? headingId : undefined} className="flex flex-col gap-6 border-t border-border pt-6">
        {heading && (
          <Heading as={heading.as} id={headingId} className="text-caption leading-none font-medium text-grey">
            {heading.text}
          </Heading>
        )}

        <ol className="grid gap-x-8 gap-y-6 md:grid-cols-2 header:grid-cols-4">
          {items.map((item, index) => (
            <li key={item.key} className="flex min-w-0 gap-2">
              <span aria-hidden="true" className="w-6 shrink-0 text-base leading-title font-medium text-accent tabular-nums">
                {String(index + 1).padStart(2, '0')}
              </span>
              <div className="flex min-w-0 flex-col gap-2">
                <p className="text-base leading-title font-medium">{item.title}</p>
                <p className="text-base leading-copy text-pretty text-grey">{item.description}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>
    </Container>
  )
}
