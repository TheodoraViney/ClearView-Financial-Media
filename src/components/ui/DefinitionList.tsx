import { cx } from './cx'

export type Definition = { key: string; label: string; value: string }

// Label / value rows divided by rules. Stacked on mobile, a 140px label column from md.
export function DefinitionList({ items, className }: { items: Definition[]; className?: string }) {
  return (
    <dl className={cx('flex min-w-0 flex-col', className)}>
      {items.map((item) => (
        <div
          key={item.key}
          className="grid min-w-0 grid-cols-1 gap-1 border-t border-border py-3 first:border-t-0 first:pt-0 last:pb-0 md:grid-cols-definition md:gap-6"
        >
          <dt className="min-w-0 text-caption break-words text-grey">{item.label}</dt>
          <dd className="m-0 min-w-0 text-base leading-copy break-words whitespace-pre-line text-pretty">{item.value}</dd>
        </div>
      ))}
    </dl>
  )
}
