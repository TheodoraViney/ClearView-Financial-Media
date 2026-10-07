'use client'

import {
  createContext,
  use,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from 'react'

/** Matches the `header` breakpoint in globals.css (`--breakpoint-header: 75rem`), where the desktop layouts start. */
export const HEADER_DESKTOP_QUERY = '(min-width: 75rem)'

type HeaderState = {
  menuOpen: boolean
  searchOpen: boolean
  setMenuOpen: (open: boolean) => void
  setSearchOpen: (open: boolean) => void
  menuId: string
  menuTrigger: RefObject<HTMLButtonElement | null>
}

const HeaderStateContext = createContext<HeaderState | null>(null)

export function useHeaderState(): HeaderState {
  const state = use(HeaderStateContext)

  if (!state) {
    throw new Error('useHeaderState must be used inside <HeaderStateProvider>')
  }

  return state
}

/**
 * Open state of the header's search field and mobile menu. Only one is open at a time:
 * opening either closes the other. Crossing the header breakpoint closes both, because
 * the controls move between layouts. Wraps server-rendered header content.
 */
export function HeaderStateProvider({ children }: { children: ReactNode }) {
  const [menuOpen, setMenu] = useState(false)
  const [searchOpen, setSearch] = useState(false)
  const menuTrigger = useRef<HTMLButtonElement>(null)
  const menuId = useId()

  useEffect(() => {
    const desktop = window.matchMedia(HEADER_DESKTOP_QUERY)
    const onChange = () => {
      setMenu(false)
      setSearch(false)
    }

    desktop.addEventListener('change', onChange)

    return () => desktop.removeEventListener('change', onChange)
  }, [])

  const value: HeaderState = {
    menuOpen,
    searchOpen,
    setMenuOpen: (open) => {
      setMenu(open)
      if (open) {
        setSearch(false)
      }
    },
    setSearchOpen: (open) => {
      setSearch(open)
      if (open) {
        setMenu(false)
      }
    },
    menuId,
    menuTrigger,
  }

  return <HeaderStateContext value={value}>{children}</HeaderStateContext>
}
