import { useId, type ReactNode } from 'react'

import { cx } from './cx'

/** The attributes `FormField` hands its control, so label, marker and error are wired by id. */
type FormFieldControlProps = {
  id: string
  'aria-invalid': boolean
  'aria-describedby': string | undefined
  'aria-required': true | undefined
}

/**
 * A labelled form control: label (500 14/14) with an optional marker at its right edge ("Optional"), 8px, the
 * control, and the error (13, `role="alert"`) once there is one. The control is rendered by `children` with the ids.
 */
export function FormField({
  label,
  marker,
  required = false,
  error,
  className,
  children,
}: {
  label: ReactNode
  marker?: ReactNode
  required?: boolean
  // The error text; the control is invalid while it is set.
  error?: ReactNode
  className?: string
  children: (control: FormFieldControlProps) => ReactNode
}) {
  const id = useId()
  const errorId = `${id}-error`
  const invalid = Boolean(error)

  return (
    <div className={cx('flex min-w-0 flex-col gap-2', className)}>
      <label
        htmlFor={id}
        className="flex items-baseline justify-between gap-2 text-sm leading-none font-medium text-foreground"
      >
        {label}
        {marker && <span className="text-caption leading-none font-normal text-grey">{marker}</span>}
      </label>
      {children({
        id,
        'aria-invalid': invalid,
        'aria-describedby': invalid ? errorId : undefined,
        'aria-required': required || undefined,
      })}
      {invalid && (
        <p id={errorId} role="alert" className="text-caption text-error">
          {error}
        </p>
      )}
    </div>
  )
}
