import { type ReactNode } from 'react'

import { cx } from './cx'

const VARIANTS = {
  default: 'text-grey',
  inverse: 'text-white/50',
}

// "Publication | date" line. Items after the first get the divider.
export function Meta({
  items,
  variant = 'default',
  className,
}: {
  items: ReactNode[]
  variant?: keyof typeof VARIANTS
  className?: string
}) {
  return (
    <span
      className={cx(
        'flex flex-wrap items-center gap-x-2 gap-y-1 text-caption',
        VARIANTS[variant],
        className,
      )}
    >
      {items.map((item, index) => (
        <span
          key={index}
          className={cx(
            'inline-flex items-center whitespace-nowrap',
            index > 0 && 'h-3.25 border-l border-border pl-2',
            index > 0 && variant === 'inverse' && 'border-white/20',
          )}
        >
          {item}
        </span>
      ))}
    </span>
  )
}
