'use client'

import { createContext, use, useState, type ReactNode } from 'react'

import { SubscribeModal } from './SubscribeModal.client'
import type { SubscribeModalData, SubscribeOpenOptions } from './types'

type SubscribeModalApi = { open: (options?: SubscribeOpenOptions) => void }

const SubscribeModalContext = createContext<SubscribeModalApi | null>(null)

/** Opens the brand's subscribe pop-up. Null outside the provider (draft-mode loading shell): triggers render nothing. */
export function useSubscribeModal(): SubscribeModalApi | null {
  return use(SubscribeModalContext)
}

/** Renders its children only inside the provider, for a block that is nothing without the pop-up. */
export function IfSubscribeModal({ children }: { children: ReactNode }) {
  return useSubscribeModal() ? children : null
}

/**
 * The brand's subscribe pop-up, one per brand shell around header, page and footer, so every trigger (header,
 * mobile menu, Subscribe banner, ClearView "Stay informed") opens the same one. Each opening starts a fresh form.
 */
export function SubscribeModalProvider({ data, children }: { data: SubscribeModalData; children: ReactNode }) {
  const [state, setState] = useState<{ open: boolean; session: number; options: SubscribeOpenOptions }>({
    open: false,
    session: 0,
    options: {},
  })

  const api: SubscribeModalApi = {
    open: (options = {}) => setState((current) => ({ open: true, session: current.session + 1, options })),
  }

  return (
    <SubscribeModalContext value={api}>
      {children}
      <SubscribeModal
        key={state.session}
        data={data}
        open={state.open}
        prefill={state.options.prefill}
        returnFocus={state.options.returnFocus}
        onClose={() => setState((current) => ({ ...current, open: false }))}
      />
    </SubscribeModalContext>
  )
}
