import { useId } from 'react'

import { Button } from './Button'
import { cx } from './cx'
import { Input } from './Input'
import { type Motion } from './motion'

export type EmailFieldStatus = 'idle' | 'error' | 'success'

// The field ring sits on the wrapper from md only (see motion.ts for the two modes).
const RING_EASE: Record<Motion, string> = {
  smooth: 'md:duration-180 md:ease-smooth',
  responsive: 'md:duration-180 md:ease-out lg:ease-smooth',
}

// Stacked on mobile, button inside the field from md up. The caller owns the <form>.
export function EmailField({
  name = 'email',
  placeholder = 'Enter your email address',
  // Accessible name of the input; the placeholder doubles as the name when it is not given.
  label,
  buttonLabel = 'Sign Up',
  status = 'idle',
  message,
  // Ring and button easing, see motion.ts.
  motion = 'smooth',
  className,
}: {
  name?: string
  placeholder?: string
  label?: string
  buttonLabel?: string
  status?: EmailFieldStatus
  message?: string
  motion?: Motion
  className?: string
}) {
  const statusId = useId()
  const invalid = status === 'error'

  return (
    <div className={cx('flex flex-col gap-2', className)}>
      <div
        className={cx(
          'flex flex-col gap-3 md:h-12.5 md:flex-row md:items-stretch md:gap-4 md:rounded-sm md:p-1 md:inset-ring md:transition-shadow lg:gap-6',
          RING_EASE[motion],
          invalid
            ? 'md:inset-ring-error'
            : 'md:inset-ring-input md:focus-within:inset-ring-focus',
        )}
      >
        <Input
          type="email"
          name={name}
          aria-label={label ?? placeholder}
          aria-invalid={invalid}
          aria-describedby={statusId}
          placeholder={placeholder}
          motion={motion}
          className="md:h-auto md:flex-1 md:bg-transparent md:px-3 md:inset-ring-0 md:focus:inset-ring-0"
        />
        <Button
          type="submit"
          size="lg"
          motion={motion}
          className="max-md:w-full md:h-auto md:w-21"
        >
          {buttonLabel}
        </Button>
      </div>
      <span
        id={statusId}
        role="status"
        aria-live="polite"
        className={cx(
          'min-h-5 text-caption leading-5',
          invalid ? 'text-error' : 'text-secondary',
        )}
      >
        {status === 'idle' ? null : message}
      </span>
    </div>
  )
}
