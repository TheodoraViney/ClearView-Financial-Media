import { type ComponentProps } from 'react'

import { cx } from './cx'
import { Icon } from './Icon'
import { EASE, type Motion } from './motion'

export type SelectOption = { key: string; label: string }

/**
 * Native single select with its own arrow: the field look of `Input size="sm"` (44 high, 12px left, 40px right for
 * the arrow). The first option is the placeholder (value ""), shown grey while chosen. Error via `aria-invalid`.
 */
export function Select({
  options,
  placeholder,
  // Ring easing, see motion.ts.
  motion = 'smooth',
  className,
  ...props
}: {
  options: SelectOption[]
  placeholder: string
  motion?: Motion
} & Omit<ComponentProps<'select'>, 'children' | 'multiple' | 'size'>) {
  return (
    <div className={cx('relative flex min-w-0', className)}>
      <select
        {...props}
        className={cx(
          'h-11 w-full min-w-0 cursor-pointer appearance-none truncate rounded-sm border-0 bg-white pr-10 pl-3 text-base leading-copy text-foreground outline-none inset-ring inset-ring-input transition-shadow focus:inset-ring-2 focus:inset-ring-focus aria-invalid:inset-ring-error unselected:text-grey *:text-foreground',
          EASE[motion],
        )}
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.key} value={option.key}>
            {option.label}
          </option>
        ))}
      </select>
      <Icon name="select-chevron" className="pointer-events-none absolute top-3.5 right-3 text-foreground" />
    </div>
  )
}
