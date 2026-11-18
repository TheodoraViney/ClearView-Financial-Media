import Link from 'next/link'
import { type ReactNode, Suspense } from 'react'

import { Container } from '@/components/ui/Container'

import { CurrentLink } from './CurrentLink.client'
import { HeaderLogo } from './HeaderLogo'
import { HeaderStateProvider } from './HeaderState.client'
import { MenuGroup, MenuTrigger, MobileMenu } from './MobileMenu.client'
import { NavDropdown } from './NavDropdown.client'
import { SearchControl } from './SearchControl.client'
import type { HeaderProps } from './types'

const NAV_LINK =
  'flex items-center text-sm leading-none whitespace-nowrap text-foreground transition-colors duration-180 ease-smooth hover:text-grey current:font-medium current:text-accent current:inset-shadow-bar'

const MENU_ROW =
  'flex min-h-12 items-center border-b border-border text-base leading-none font-medium text-foreground transition-colors duration-180 ease-out hover:text-grey current:text-accent'

/** A menu link marked as current while its section is open; until the pathname resolves, the plain link renders. */
function NavLink({ href, className, children }: { href: string; className: string; children: ReactNode }) {
  return (
    <Suspense
      fallback={
        <Link href={href} className={className}>
          {children}
        </Link>
      }
    >
      <CurrentLink href={href} className={className}>
        {children}
      </CurrentLink>
    </Suspense>
  )
}

/**
 * ClearView group header: links and dropdown groups; a link is marked as current while its section is open
 * (for example Awards on /events-category/awards), as on the publication headers. On desktop (the
 * `header` breakpoint) the logo and search sit in cells at the page edge with 24px padding, not
 * on the page gutter, and the menu is centred between them. Below it: logo, search and the menu
 * button, with groups as accordions in the menu panel.
 */
export function GroupHeader({ logo, homeHref, items, searchPlaceholder, searchLabels }: HeaderProps) {
  return (
    <header className="sticky top-0 z-40 h-header border-y border-border bg-white">
      <HeaderStateProvider>
        <Container className="flex h-full items-center justify-between gap-4 header:items-stretch header:px-0">
          <div className="flex shrink-0 items-center header:px-6">
            <HeaderLogo logo={logo} homeHref={homeHref} className="h-7 w-auto" />
          </div>
          {items.length > 0 && (
            <nav aria-label="Primary" className="hidden min-w-0 flex-1 header:flex">
              <ul className="flex min-w-0 flex-1 items-stretch justify-center-safe gap-6">
                {items.map((item) => (
                  <li key={item.key} className="flex">
                    {item.kind === 'link' ? (
                      <NavLink href={item.href} className={NAV_LINK}>
                        {item.label}
                      </NavLink>
                    ) : (
                      <NavDropdown label={item.label} links={item.links} />
                    )}
                  </li>
                ))}
              </ul>
            </nav>
          )}
          <div className="flex shrink-0 items-center gap-2 header:border-l header:border-border header:px-6">
            <SearchControl variant="group" placeholder={searchPlaceholder} labels={searchLabels} />
            {items.length > 0 && <MenuTrigger />}
          </div>
        </Container>
        {items.length > 0 && (
          <MobileMenu className="pb-4">
            <ul>
              {items.map((item) => (
                <li key={item.key}>
                  {item.kind === 'link' ? (
                    <NavLink href={item.href} className={MENU_ROW}>
                      {item.label}
                    </NavLink>
                  ) : (
                    <MenuGroup label={item.label} links={item.links} />
                  )}
                </li>
              ))}
            </ul>
          </MobileMenu>
        )}
      </HeaderStateProvider>
    </header>
  )
}
