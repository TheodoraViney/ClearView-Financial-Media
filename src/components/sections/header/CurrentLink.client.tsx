'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { type ReactNode } from 'react'

import { type NavSection, sectionOfHref, sectionOfPath, useDeclaredNavSection } from './nav-section.client'

// The proxy rewrites `/{path}` to `/sites/{brand}/{path}`. Strip the internal prefix in case
// the router reports the rewritten path, so server and client agree on the public one.
const INTERNAL_PREFIX = /^\/sites\/[^/]+(?=\/|$)/

/**
 * True when `href` is the current section: the same path or a path below it, or, for a link to a ClearView listing,
 * a page of that listing's section (`declared` is the section an /events/{slug} page declared). Home and absolute URLs
 * never match.
 */
export function isCurrentPath(pathname: string, href: string, declared: NavSection | null = null): boolean {
  if (!href.startsWith('/') || href === '/') {
    return false
  }

  const path = pathname.replace(INTERNAL_PREFIX, '') || '/'

  if (path === href || path.startsWith(`${href}/`)) {
    return true
  }

  const section = sectionOfHref(href)

  return section !== null && (sectionOfPath(path) ?? declared) === section
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
  const declared = useDeclaredNavSection()

  return (
    <Link
      href={href}
      aria-current={isCurrentPath(pathname, href, declared) ? 'page' : undefined}
      className={className}
    >
      {children}
    </Link>
  )
}
