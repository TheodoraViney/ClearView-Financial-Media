'use client'

import { type ReactNode } from 'react'

import { SubscribeButton } from '@/components/sections/subscribe/SubscribeButton.client'

import { useHeaderState } from './HeaderState.client'

/**
 * Subscribe in the publication header: the desktop button (from the header breakpoint) or the mobile menu's. Both
 * close the menu and search before the pop-up opens; from the menu, focus returns to the menu button, since the
 * menu is closed by then.
 */
export function HeaderSubscribe({ placement, children }: { placement: 'bar' | 'menu'; children: ReactNode }) {
  const { setMenuOpen, setSearchOpen, menuTrigger } = useHeaderState()

  const closeHeader = () => {
    setMenuOpen(false)
    setSearchOpen(false)

    return placement === 'menu' ? menuTrigger.current : null
  }

  return placement === 'bar' ? (
    <SubscribeButton onBeforeOpen={closeHeader} className="px-4.5 font-medium">
      {children}
    </SubscribeButton>
  ) : (
    <SubscribeButton
      onBeforeOpen={closeHeader}
      variant="outline-accent"
      size="lg"
      fullWidth
      motion="responsive"
      className="font-medium"
    >
      {children}
    </SubscribeButton>
  )
}
