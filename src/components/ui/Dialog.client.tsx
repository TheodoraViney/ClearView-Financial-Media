'use client'

import { useEffect, useRef, type ReactNode } from 'react'

import { IconButton } from './IconButton'

/**
 * A modal dialog on the native `<dialog>` with `showModal()`: top layer, the page behind inert (focus stays inside),
 * Escape through the `cancel` event. The dialog element itself is the overlay (foreground/48, padding 16 / 32 from
 * md) and scrolls; the card (max 520, padding 24 / 32 from md) is centred and moves to the top when taller than the
 * viewport. Closes with ×, Escape and a press on the overlay. On open it focuses the element marked `data-autofocus`
 * (else the first focusable one) and locks the page scroll; on close it returns focus to `returnFocus`, else to the
 * element focused before. No animation, as in the design.
 */
export function Dialog({
  open,
  onClose,
  labelledBy,
  describedBy,
  closeLabel,
  returnFocus,
  children,
}: {
  open: boolean
  onClose: () => void
  // Ids of the title and description inside the card.
  labelledBy: string
  describedBy?: string
  // Accessible name of the × button.
  closeLabel: string
  returnFocus?: HTMLElement | null
  children: ReactNode
}) {
  const dialog = useRef<HTMLDialogElement>(null)
  const pressStartedOnOverlay = useRef(false)
  // The latest callbacks, read from the effects without re-running them.
  const latest = useRef({ onClose, returnFocus })

  useEffect(() => {
    latest.current = { onClose, returnFocus }
  })

  useEffect(() => {
    const element = dialog.current

    if (!element || !open) {
      return
    }

    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const root = document.documentElement
    // Hiding the scrollbar would shift the page by its width; keep its gutter instead.
    const hasScrollbar = window.innerWidth > root.clientWidth
    const { overflow, scrollbarGutter } = root.style

    root.style.overflow = 'hidden'

    if (hasScrollbar) {
      root.style.scrollbarGutter = 'stable'
    }

    if (!element.open) {
      element.showModal()
    }

    element.querySelector<HTMLElement>('[data-autofocus]')?.focus()

    return () => {
      root.style.overflow = overflow
      root.style.scrollbarGutter = scrollbarGutter

      if (element.open) {
        element.close()
      }

      const target = latest.current.returnFocus ?? previous

      if (target?.isConnected) {
        target.focus()
      }
    }
  }, [open])

  return (
    <dialog
      ref={dialog}
      // The scrolling overlay is not a stop of its own: Tab moves between the card's controls only, and the overlay
      // shows no ring when a press focuses it. The keyboard still scrolls it once focus is inside.
      tabIndex={-1}
      aria-labelledby={labelledBy}
      aria-describedby={describedBy}
      // Escape: keep the element open until the state closes it, so both stay in step.
      onCancel={(event) => {
        event.preventDefault()
        latest.current.onClose()
      }}
      // Closed by the browser anyway (a repeated Escape can skip `cancel`): follow it. The event is queued, so the
      // element may be open again by then (effect re-run): then it is stale.
      onClose={(event) => {
        if (open && !event.currentTarget.open) {
          latest.current.onClose()
        }
      }}
      // Only a press that starts and ends on the overlay closes, so a text selection dragged out of the card does not.
      onPointerDown={(event) => {
        pressStartedOnOverlay.current = event.target === event.currentTarget
      }}
      onClick={(event) => {
        if (pressStartedOnOverlay.current && event.target === event.currentTarget) {
          latest.current.onClose()
        }

        pressStartedOnOverlay.current = false
      }}
      className="fixed inset-0 m-0 size-full max-h-none max-w-none items-start overflow-y-auto overscroll-contain border-0 bg-foreground/48 p-4 text-foreground outline-none backdrop:bg-transparent open:flex md:p-8"
    >
      <div className="relative m-auto flex w-full max-w-130 flex-col gap-6 rounded-sm border border-border bg-white p-6 md:p-8">
        <IconButton
          icon="close"
          label={closeLabel}
          motion="out"
          onClick={onClose}
          className="absolute top-3 right-3"
        />
        {children}
      </div>
    </dialog>
  )
}
