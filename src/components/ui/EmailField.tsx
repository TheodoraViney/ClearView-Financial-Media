import { useId } from 'react'

import { Button } from './Button'
import { cx } from './cx'
import { Input } from './Input'

export type EmailFieldStatus = 'idle' | 'error' | 'success'

// Stacked on mobile, button inside the field from md up. The caller owns the <form>.
export function EmailField({
  name = 'email',
  placeholder = 'Enter your email address',
  buttonLabel = 'Sign Up',
  status = 'idle',
  message,
  className,
}: {
  name?: string
  placeholder?: string
  buttonLabel?: string
  status?: EmailFieldStatus
  message?: string
  className?: string
}) {
  const statusId = useId()
  const invalid = status === 'error'

  return (
    <div className={cx('flex flex-col gap-2', className)}>
      <div
        className={cx(
          'flex flex-col gap-3 md:h-12.5 md:flex-row md:items-stretch md:gap-4 md:rounded-sm md:p-1 md:inset-ring md:transition-shadow md:duration-180 md:ease-smooth lg:gap-6',
          invalid
            ? 'md:inset-ring-error'
            : 'md:inset-ring-input md:focus-within:inset-ring-focus',
        )}
      >
        <Input
          type="email"
          name={name}
          aria-label={placeholder}
          aria-invalid={invalid}
          aria-describedby={statusId}
          placeholder={placeholder}
          className="md:h-auto md:flex-1 md:bg-transparent md:px-3 md:inset-ring-0 md:focus:inset-ring-0"
        />
        <Button
          type="submit"
          size="lg"
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
