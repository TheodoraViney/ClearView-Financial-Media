'use client'

import { useId, useState, type ReactNode } from 'react'

import { cx } from './cx'
import { Icon } from './Icon'

/**
 * An accent text toggle that shows and hides a panel below it: "View biography ›" / "Hide biography", `aria-expanded`
 * + `aria-controls`, the chevron turns 90° (180ms ease-out), the label fades to 60% on hover. 14/14 as in the
 * shared-shell speaker-card. Meant for a flex column with an 8px gap: the 44px target is taken back with negative
 * margins so it occupies the design's 24px, 16px below the previous line; the panel follows 12px below.
 * Closed on the server; the panel renders only when open.
 */
export function Disclosure({
  showLabel,
  hideLabel,
  children,
}: {
  showLabel: string
  hideLabel: string
  children: ReactNode
}) {
  const [open, setOpen] = useState(false)
  const id = useId()

  return (
    <>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((value) => !value)}
        className="-mt-0.5 -mb-2.5 inline-flex min-h-11 cursor-pointer items-center gap-2 self-start text-sm leading-none whitespace-nowrap text-accent transition-opacity duration-180 ease-out hover:opacity-60"
      >
        {open ? hideLabel : showLabel}
        <Icon name="chevron-right" className={cx('transition-transform duration-180 ease-out', open && 'rotate-90')} />
      </button>
      <div id={id} hidden={!open} className="mt-1">
        {open && children}
      </div>
    </>
  )
}
