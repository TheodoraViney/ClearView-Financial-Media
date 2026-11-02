import { Button } from './Button'
import { Heading } from './Heading'
import { Icon, type IconName } from './Icon'
import { ListLink } from './ListLink'
import { type HeadingLevel } from '@/lib/headings'

export type DestinationCardItem = { key: string; title: string; href: string | null; meta: string[] }

/**
 * A destination card (WB v2.0 Explore `destination-card`): bordered, 24 padding, 24 between parts; the heading 20/1.25
 * in the accent with a 32px icon, top-aligned (the design system's card title row rule); up to three items (title
 * 16/1.3, meta 13/13, grey on hover); the outline "View all" button pinned to the bottom, so cards in a row align.
 * Fills its grid cell.
 */
export function DestinationCard({
  heading,
  icon,
  items,
  button,
}: {
  heading: { as: HeadingLevel; text: string } | null
  icon: IconName | null
  items: DestinationCardItem[]
  button: { href: string; label: string } | null
}) {
  return (
    <div className="flex w-full min-w-0 flex-col gap-6 rounded-sm border border-border p-6">
      {(heading || icon) && (
        <div className="flex min-h-8 items-start gap-4 text-accent">
          {heading && (
            <Heading as={heading.as} className="flex-1 text-title-lg leading-tight font-medium text-pretty">
              {heading.text}
            </Heading>
          )}
          {icon && <Icon name={icon} className="ml-auto size-8" />}
        </div>
      )}

      {items.length > 0 && (
        <ul className="flex flex-col gap-5 pb-4">
          {items.map((item) => (
            <li key={item.key}>
              <ListLink href={item.href} title={item.title} meta={item.meta} motion="out" metaClassName="leading-none" />
            </li>
          ))}
        </ul>
      )}

      {button && (
        <Button href={button.href} variant="outline" arrow motion="out" className="mt-auto">
          {button.label}
        </Button>
      )}
    </div>
  )
}
