import { type ComponentProps, type ReactNode } from 'react'

import { cx } from './cx'
import { Icon } from './Icon'
import { EASE, type Motion } from './motion'

// Native checkbox kept for forms and a11y; the visible box follows it through peer-checked.
export function Checkbox({
  label,
  // Box and tick easing, see motion.ts.
  motion = 'smooth',
  className,
  ...props
}: { label: ReactNode; motion?: Motion } & Omit<ComponentProps<'input'>, 'type'>) {
  return (
    <label
      className={cx(
        'group relative flex min-h-11 cursor-pointer items-center gap-3 md:min-h-8 lg:min-h-0',
        className,
      )}
    >
      <input {...props} type="checkbox" className="peer sr-only" />
      <span
        aria-hidden="true"
        className={cx(
          'flex size-4 shrink-0 items-center justify-center rounded-sm border border-dark bg-white text-white transition-colors peer-checked:border-accent peer-checked:bg-accent peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-focus',
          EASE[motion],
        )}
      >
        <span
          className={cx(
            'scale-70 opacity-0 transition group-has-checked:scale-100 group-has-checked:opacity-100',
            EASE[motion],
          )}
        >
          <Icon name="check" />
        </span>
      </span>
      <span className="flex-1 text-base leading-heading text-foreground lg:leading-none">
        {label}
      </span>
    </label>
  )
}
