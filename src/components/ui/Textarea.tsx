import { type ComponentProps } from 'react'

import { cx } from './cx'
import { FIELD_RING, fieldClasses } from './Input'
import { type Motion } from './motion'

/**
 * A multi-line field with the `Input` look (ring, 2px focus ring, error ring, optional hover ring): 6 rows, at least
 * 160px high, 12px padding, resizable vertically only. Opt-in `autoGrow` (Contact form) grows the field with its
 * text through CSS `field-sizing: content`, from the same 160px minimum; browsers without it keep the 6 rows.
 */
export function Textarea({
  motion = 'smooth',
  hover = false,
  autoGrow = false,
  rows = 6,
  className,
  ...props
}: { motion?: Motion; hover?: boolean; autoGrow?: boolean } & ComponentProps<'textarea'>) {
  return (
    <textarea
      {...props}
      rows={rows}
      className={cx(fieldClasses({ motion, hover }), FIELD_RING, 'min-h-40 resize-y p-3 focus:inset-ring-2', autoGrow && 'field-sizing-content', className)}
    />
  )
}
