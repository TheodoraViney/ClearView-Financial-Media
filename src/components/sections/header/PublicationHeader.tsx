import Link from 'next/link'
import { Suspense, type ComponentType, type ReactNode } from 'react'

import { Button } from '@/components/ui/Button'
import { Container } from '@/components/ui/Container'
import { cx } from '@/components/ui/cx'

import { CurrentLink } from './CurrentLink.client'
import { HeaderLogo } from './HeaderLogo'
import { HeaderStateProvider } from './HeaderState.client'
import { MenuTrigger, MobileMenu } from './MobileMenu.client'
import { SearchControl } from './SearchControl.client'
import type { HeaderLink, HeaderProps } from './types'

export type PublicationHeaderProps = HeaderProps & {
  subscribe: Omit<HeaderLink, 'key'> | null
}

type NavLinkComponent = ComponentType<{ href: string; className?: string; children: ReactNode }>

// Hover and the current page both take the brand accent; the current item adds weight and a bottom bar.
// The negative focus offset keeps the outline inside the scrolling list, which clips overflow.
const NAV_LINK =
  'flex h-full items-center text-sm leading-none whitespace-nowrap text-foreground transition-colors duration-180 ease-smooth hover:text-accent focus-visible:-outline-offset-2 current:font-medium current:text-accent current:inset-shadow-bar'

// Mobile menu rows: the current page takes the accent, without the bar.
const MENU_ROW =
  'flex min-h-12 items-center border-b border-border text-base leading-none font-medium text-foreground transition-colors duration-180 ease-out hover:text-accent current:text-accent'

function NavItems({
  links,
  LinkComponent,
  linkClassName,
  className,
}: {
  links: HeaderLink[]
  LinkComponent: NavLinkComponent
  linkClassName: string
  className?: string
}) {
  return (
    <ul className={className}>
      {links.map((link) => (
        <li key={link.key} className="flex flex-col">
          <LinkComponent href={link.href} className={linkClassName}>
            {link.label}
          </LinkComponent>
        </li>
      ))}
    </ul>
  )
}

/** The links with the current section marked; until the pathname resolves, the plain links render. */
function CurrentNavItems(props: { links: HeaderLink[]; linkClassName: string; className?: string }) {
  return (
    <Suspense fallback={<NavItems {...props} LinkComponent={Link} />}>
      <NavItems {...props} LinkComponent={CurrentLink} />
    </Suspense>
  )
}

/**
 * Publication header (WealthBriefing, WealthBriefingAsia, Family Wealth Report): logo, a flat menu
 * with the current section marked, search and Subscribe. Desktop from the `header` breakpoint;
 * below it logo, search and the menu button, with Subscribe at the end of the menu panel.
 */
export function PublicationHeader({
  logo,
  homeHref,
  items,
  searchPlaceholder,
  subscribe,
}: PublicationHeaderProps) {
  const links = items.flatMap((item) => (item.kind === 'link' ? [item] : []))
  const hasMenu = links.length > 0 || subscribe !== null

  return (
    <header className="relative z-40 h-14.5 border-y border-border bg-white md:h-16 header:h-20">
      <HeaderStateProvider>
        <Container className="flex h-full items-center justify-between gap-6 header:px-16">
          <HeaderLogo
            logo={logo}
            homeHref={homeHref}
            className="h-auto w-header-logo header:h-10 header:w-auto"
          />
          {links.length > 0 && (
            <nav aria-label="Primary" className="hidden min-w-0 flex-1 self-stretch header:flex">
              <CurrentNavItems
                links={links}
                linkClassName={NAV_LINK}
                className="flex min-w-0 flex-1 items-stretch justify-center-safe gap-7 overflow-x-auto scrollbar-none"
              />
            </nav>
          )}
          <div className="flex shrink-0 items-center gap-2">
            <SearchControl variant="publication" placeholder={searchPlaceholder} />
            {subscribe && (
              <div className="hidden header:flex">
                <Button href={subscribe.href} className="px-4.5 font-medium">
                  {subscribe.label}
                </Button>
              </div>
            )}
            {hasMenu && <MenuTrigger />}
          </div>
        </Container>
        {hasMenu && (
          <MobileMenu className="pb-6">
            {links.length > 0 && <CurrentNavItems links={links} linkClassName={MENU_ROW} />}
            {subscribe && (
              <div className={cx('flex flex-col', links.length > 0 && 'mt-5')}>
                <Button
                  href={subscribe.href}
                  variant="outline-accent"
                  size="lg"
                  fullWidth
                  motion="responsive"
                  className="font-medium"
                >
                  {subscribe.label}
                </Button>
              </div>
            )}
          </MobileMenu>
        )}
      </HeaderStateProvider>
    </header>
  )
}
