'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { type ReactNode } from 'react'

// The proxy rewrites `/{path}` to `/sites/{brand}/{path}`. Strip the internal prefix in case
// the router reports the rewritten path, so server and client agree on the public one.
const INTERNAL_PREFIX = /^\/sites\/[^/]+(?=\/|$)/

/** True when `href` is the current section: the same path or a path below it. Home and absolute URLs never match. */
export function isCurrentPath(pathname: string, href: string): boolean {
  if (!href.startsWith('/') || href === '/') {
    return false
  }

  const path = pathname.replace(INTERNAL_PREFIX, '') || '/'

  return path === href || path.startsWith(`${href}/`)
}

/**
 * A nav link that marks itself with `aria-current="page"` while its section is open.
 * Style the state with the `current:` variant. Reads the pathname, so it renders inside a
 * Suspense boundary whose fallback is the same link without the state.
 */
export function CurrentLink({
  href,
  className,
  children,
}: {
  href: string
  className?: string
  children: ReactNode
}) {
  const pathname = usePathname()

  return (
    <Link
      href={href}
      aria-current={isCurrentPath(pathname, href) ? 'page' : undefined}
      className={className}
    >
      {children}
    </Link>
  )
}
