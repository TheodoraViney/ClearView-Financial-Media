import { useId, type ReactNode } from 'react'

import { cx } from './cx'

/**
 * A fieldset of checkboxes: legend (500 14/14), 16px, the boxes 12px apart, and the error once there is one.
 * Without a legend, `labelledBy` names the group for screen readers. The caller renders the `Checkbox`es as children.
 */
export function CheckboxGroup({
  legend,
  labelledBy,
  error,
  className,
  children,
}: {
  legend?: ReactNode
  // Id of the element that names the group when there is no visible legend.
  labelledBy?: string
  error?: ReactNode
  className?: string
  children: ReactNode
}) {
  const errorId = useId()
  const invalid = Boolean(error)

  return (
    <fieldset
      aria-labelledby={legend ? undefined : labelledBy}
      aria-describedby={invalid ? errorId : undefined}
      className={cx('min-w-0', className)}
    >
      {legend && <legend className="mb-4 text-sm leading-none font-medium text-foreground">{legend}</legend>}
      <div className="flex flex-col gap-3">{children}</div>
      {invalid && (
        <p id={errorId} role="alert" className="mt-2 text-caption text-error">
          {error}
        </p>
      )}
    </fieldset>
  )
}
