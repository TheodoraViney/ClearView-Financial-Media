import { type ComponentProps, type ReactNode } from 'react'

import { cx } from './cx'
import { Icon } from './Icon'
import { EASE, type Motion } from './motion'

// `md` is the ClearView "Stay informed" look. `sm` is the subscribe pop-up: a 2px-radius box with the field ring,
// a 10×8 tick, 14/20 text. The row is 24 high from md and 44 below (touch target), the box on the first text line,
// so a label that wraps (consent) keeps the box at its top.
const SIZES = {
  md: {
    row: 'min-h-11 items-center md:min-h-8 lg:min-h-0',
    box: 'rounded-sm border border-dark peer-checked:border-accent',
    tick: 'check',
    label: 'text-base leading-heading lg:leading-none',
  },
  sm: {
    row: 'items-start py-3 md:py-0.5',
    box: 'mt-0.5 rounded-xs inset-ring inset-ring-input peer-checked:inset-ring-0 peer-aria-invalid:inset-ring-error',
    tick: 'check-sm',
    label: 'text-sm leading-5',
  },
} as const

type CheckboxSize = keyof typeof SIZES

// Native checkbox kept for forms and a11y; the visible box follows it through peer-checked.
export function Checkbox({
  label,
  size = 'md',
  // Ticked and disabled, for an option that is always on (the publication's own daily news). A disabled input is
  // not submitted, so the form adds it itself.
  locked = false,
  // Shown after the label, e.g. "Required" beside a locked box.
  marker,
  // Box and tick easing, see motion.ts.
  motion = 'smooth',
  className,
  ...props
}: {
  label: ReactNode
  size?: CheckboxSize
  locked?: boolean
  marker?: ReactNode
  motion?: Motion
} & Omit<ComponentProps<'input'>, 'type' | 'size'>) {
  const look = SIZES[size]

  return (
    <label
      className={cx(
        'group relative flex gap-3',
        locked ? 'cursor-default' : 'cursor-pointer',
        look.row,
        className,
      )}
    >
      <input
        {...props}
        {...(locked && { checked: true, disabled: true, readOnly: true })}
        type="checkbox"
        className="peer sr-only"
      />
      <span
        aria-hidden="true"
        className={cx(
          'flex size-4 shrink-0 items-center justify-center bg-white text-white transition-colors peer-checked:bg-accent peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-focus',
          look.box,
          EASE[motion],
        )}
      >
        <span
          className={cx(
            'scale-70 opacity-0 transition group-has-checked:scale-100 group-has-checked:opacity-100',
            EASE[motion],
          )}
        >
          <Icon name={look.tick} />
        </span>
      </span>
      <span className={cx('flex-1 text-foreground', look.label, marker !== undefined && 'flex flex-wrap items-baseline gap-x-2')}>
        {label}
        {marker !== undefined && <span className="text-caption leading-none text-grey">{marker}</span>}
      </span>
    </label>
  )
}
