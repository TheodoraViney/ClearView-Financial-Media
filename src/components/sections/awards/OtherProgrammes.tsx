import { cx } from '@/components/ui/cx'
import { Heading } from '@/components/ui/Heading'
import { ListLink } from '@/components/ui/ListLink'
import type { AwardCategoryView } from '@/lib/award-category'

// shared-shell other-awards-programme-card `spacing`: `default` 8px between title and meta, padding 16 / 16;
// `relaxed` 16px between them, padding 16 / 24.
const SPACING = {
  default: { relaxed: false, className: 'py-4' },
  relaxed: { relaxed: true, className: 'pt-4 pb-6' },
}

/**
 * Other awards programmes (shared-shell other-awards-programme-card): title, then status | place | date, the rows
 * divided by rules. A picked past edition has no status. The heading's tag comes from the CMS; the list shows without
 * it when it is empty. The award category page uses `relaxed`, the awards programme page `default` (as each design).
 */
export function OtherProgrammes({
  heading,
  items,
  spacing,
  className,
}: AwardCategoryView['otherProgrammes'] & { spacing: keyof typeof SPACING; className?: string }) {
  return (
    <section
      aria-labelledby={heading ? 'other-programmes-heading' : undefined}
      className={cx('flex flex-col gap-6', className)}
    >
      {heading && (
        <Heading as={heading.as} id="other-programmes-heading" className="text-title-lg leading-tight font-medium">
          {heading.text}
        </Heading>
      )}
      <ul className="flex flex-col border-t border-border">
        {items.map((item) => (
          <li key={item.key} className="border-b border-border last:border-b-0">
            <ListLink
              variant="accent"
              relaxed={SPACING[spacing].relaxed}
              href={item.href}
              title={item.title}
              meta={[
                ...(item.status
                  ? [
                      <span key="status" className={item.highlight ? 'text-accent' : undefined}>
                        {item.status}
                      </span>,
                    ]
                  : []),
                ...item.meta,
              ]}
              className={SPACING[spacing].className}
            />
          </li>
        ))}
      </ul>
    </section>
  )
}
