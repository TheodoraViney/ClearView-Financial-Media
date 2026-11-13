import { cx } from './cx'

export type Definition = { key: string; label: string; value: string }

const VARIANTS = {
  // Fact box: 13 grey label, 16 dark value, 140px label column from md, 12px rows.
  default: {
    row: 'gap-1 py-3 last:pb-0 md:grid-cols-definition md:gap-6',
    label: 'text-caption text-grey',
    value: 'text-base leading-copy',
  },
  // Award category details: 16/20.8 500 dark label, 16/22.4 grey copy up to 640px, a 4 / 8 split with a 32px gap
  // from md, 24px rows (shared-shell award-category-detail).
  detail: {
    row: 'gap-2 py-6 md:grid-cols-detail md:gap-8',
    label: 'text-base leading-title font-medium text-foreground',
    value: 'max-w-160 text-base leading-copy text-grey',
  },
}

// Label / value rows divided by rules. Stacked on mobile, side by side from md.
export function DefinitionList({
  items,
  variant = 'default',
  className,
}: {
  items: Definition[]
  variant?: keyof typeof VARIANTS
  className?: string
}) {
  const look = VARIANTS[variant]

  return (
    <dl className={cx('flex min-w-0 flex-col', className)}>
      {items.map((item) => (
        <div
          key={item.key}
          className={cx('grid min-w-0 grid-cols-1 border-t border-border first:border-t-0 first:pt-0', look.row)}
        >
          <dt className={cx('min-w-0 break-words', look.label)}>{item.label}</dt>
          <dd className={cx('m-0 min-w-0 break-words whitespace-pre-line text-pretty', look.value)}>{item.value}</dd>
        </div>
      ))}
    </dl>
  )
}
