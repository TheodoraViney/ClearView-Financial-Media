import Link from 'next/link'

import { Icon } from './Icon'

/**
 * shared-shell link-row: a full-width 16/500 label with a 16px chevron, a rule above, 56px minimum (16px padding).
 * Hover: accent label and the chevron moves 2px, 180ms ease-out (awards programme marketing kit → Annual Acclaim).
 */
export function LinkRow({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      prefetch={false}
      className="group flex min-h-14 w-full min-w-0 items-center justify-between gap-4 border-t border-border py-4 text-base leading-title font-medium text-foreground transition-colors duration-180 ease-out hover:text-accent"
    >
      <span className="min-w-0 text-pretty wrap-anywhere">{label}</span>
      <Icon name="row-chevron" className="shrink-0 transition-transform duration-180 ease-out group-hover:translate-x-0.5" />
    </Link>
  )
}
