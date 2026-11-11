import { cx } from '@/components/ui/cx'
import { Heading } from '@/components/ui/Heading'
import { ListLink } from '@/components/ui/ListLink'
import type { HeadingValue } from '@/sanity/heading'

/**
 * "Explore related topics": the editor's categories and topics as rows linking to the filtered list, 4 columns from
 * the header breakpoint, 2 from md, 1 below. The list is clipped by 1px at the bottom so the last row has no rule.
 */
export function RelatedTopics({
  heading,
  items,
  className,
}: {
  heading: HeadingValue | null
  items: { key: string; label: string; href: string }[]
  className?: string
}) {
  return (
    <section aria-labelledby={heading ? 'related-topics-heading' : undefined} className={cx('flex flex-col gap-6', className)}>
      {heading && (
        <Heading as={heading.as} className="text-heading-lg font-medium">
          <span id="related-topics-heading">{heading.text}</span>
        </Heading>
      )}
      <div className="min-w-0 overflow-y-clip">
        <ul className="-mb-px grid grid-cols-1 gap-x-8 md:grid-cols-2 header:grid-cols-4">
          {items.map((item) => (
            <li key={item.key} className="flex min-w-0 flex-col">
              <ListLink variant="row" motion="out" href={item.href} title={item.label} />
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
