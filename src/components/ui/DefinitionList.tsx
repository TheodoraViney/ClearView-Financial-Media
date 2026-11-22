import { cx } from './cx'

export type Definition = { key: string; label: string; value: string }

/** A label with a list of values, one per line (partner profile Clients and platform). */
export type DefinitionValues = { key: string; label: string; values: string[] }

const DIVIDED = 'border-t border-border first:border-t-0 first:pt-0'

const VARIANTS = {
  // Fact box: 13 grey label, 16 dark value, 140px label column from md, 12px rows.
  default: {
    list: undefined,
    row: cx(DIVIDED, 'gap-1 py-3 last:pb-0 md:grid-cols-definition md:gap-6'),
    label: 'text-caption text-grey',
    value: 'text-base leading-copy',
  },
  // Award category details: 16/20.8 500 dark label, 16/22.4 grey copy up to 640px, a 4 / 8 split with a 32px gap
  // from md, 24px rows (shared-shell award-category-detail).
  detail: {
    list: undefined,
    row: cx(DIVIDED, 'gap-2 py-6 md:grid-cols-detail md:gap-8'),
    label: 'text-base leading-title font-medium text-foreground',
    value: 'max-w-160 text-base leading-copy text-grey',
  },
  // Partner profile Clients and platform (partner-profile-fields): 16/20.8 500 label, the values a list 8px apart in
  // 16/22.4 dark, two equal columns 32px apart from md, stacked 12px apart below; 24px rows.
  fields: {
    list: undefined,
    row: cx(DIVIDED, 'gap-3 py-6 md:grid-cols-2 md:gap-x-8'),
    label: 'text-base leading-title font-medium text-foreground',
    value: 'text-base leading-copy text-foreground',
  },
  // Event venue and practical information (shared-shell event-info-block `plain`): one column at every breakpoint, no
  // rules, 20px between items; 13/13 grey label 8px above the 16/22.4 dark value.
  plain: {
    list: 'gap-5',
    row: 'gap-2',
    label: 'text-caption leading-none text-grey',
    value: 'text-base leading-copy text-foreground',
  },
}

// Label / value rows divided by rules. Stacked on mobile, side by side from md. A row with `values` lists them.
export function DefinitionList({
  items,
  variant = 'default',
  className,
}: {
  items: (Definition | DefinitionValues)[]
  variant?: keyof typeof VARIANTS
  className?: string
}) {
  const look = VARIANTS[variant]

  return (
    <dl className={cx('flex min-w-0 flex-col', look.list, className)}>
      {items.map((item) => (
        <div
          key={item.key}
          className={cx('grid min-w-0 grid-cols-1', look.row)}
        >
          <dt className={cx('min-w-0 break-words', look.label)}>{item.label}</dt>
          <dd className={cx('m-0 min-w-0 break-words whitespace-pre-line text-pretty', look.value)}>
            {'values' in item ? (
              <ul className="flex flex-col gap-2">
                {item.values.map((value, index) => (
                  <li key={index} className="min-w-0">
                    {value}
                  </li>
                ))}
              </ul>
            ) : (
              item.value
            )}
          </dd>
        </div>
      ))}
    </dl>
  )
}
