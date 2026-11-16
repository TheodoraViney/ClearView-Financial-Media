import Link from 'next/link'

import { cx } from './cx'
import { Icon } from './Icon'

// The chevron beside the label: centred on the row (default), or on the label's first line for labels that wrap
// (shared-shell link-row `chevron-align="top"`: event page Related coverage).
const CHEVRON_ALIGN = {
  center: { row: 'items-center', icon: undefined },
  top: { row: 'items-start', icon: 'mt-0.5' },
}

const ROW =
  'flex min-h-14 w-full min-w-0 justify-between gap-4 border-t border-border py-4 text-base leading-title font-medium text-foreground'

/**
 * shared-shell link-row: a full-width 16/500 label with a 16px chevron, a rule above, 56px minimum (16px padding).
 * Hover: accent label and the chevron moves 2px, 180ms ease-out (awards programme marketing kit → Annual Acclaim).
 */
export function LinkRow({
  href,
  label,
  chevronAlign = 'center',
}: {
  href: string
  label: string
  chevronAlign?: keyof typeof CHEVRON_ALIGN
}) {
  const align = CHEVRON_ALIGN[chevronAlign]

  return (
    <Link
      href={href}
      prefetch={false}
      className={cx('group', ROW, align.row, 'transition-colors duration-180 ease-out hover:text-accent')}
    >
      <span className="min-w-0 text-pretty wrap-anywhere">{label}</span>
      <Icon
        name="row-chevron"
        className={cx('shrink-0 transition-transform duration-180 ease-out group-hover:translate-x-0.5', align.icon)}
      />
    </Link>
  )
}
