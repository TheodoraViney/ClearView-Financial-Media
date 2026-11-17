import { type ComponentProps } from 'react'

import { cx } from './cx'
import { FIELD_RING, fieldClasses } from './Input'
import { type Motion } from './motion'

/**
 * A multi-line field with the `Input` look (ring, 2px focus ring, error ring, optional hover ring): 6 rows, at least
 * 160px high, 12px padding, resizable vertically only.
 */
export function Textarea({
  motion = 'smooth',
  hover = false,
  rows = 6,
  className,
  ...props
}: { motion?: Motion; hover?: boolean } & ComponentProps<'textarea'>) {
  return (
    <textarea
      {...props}
      rows={rows}
      className={cx(fieldClasses({ motion, hover }), FIELD_RING, 'min-h-40 resize-y p-3 focus:inset-ring-2', className)}
    />
  )
}
