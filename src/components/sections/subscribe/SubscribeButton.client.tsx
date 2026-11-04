'use client'

import { type ReactNode } from 'react'

import { buttonClasses, type ButtonSize, type ButtonVariant } from '@/components/ui/Button'
import { type Motion } from '@/components/ui/motion'

import { useSubscribeModal } from './SubscribeModalProvider.client'

/**
 * A button with the `Button` look that opens the subscribe pop-up. Renders nothing outside the provider.
 * `onBeforeOpen` lets the header close its menu and search first, and name where focus returns.
 */
export function SubscribeButton({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  motion = 'smooth',
  onBeforeOpen,
  className,
  children,
}: {
  variant?: ButtonVariant
  size?: ButtonSize
  fullWidth?: boolean
  motion?: Motion
  // Returns the element focus goes back to on close, when it is not this button.
  onBeforeOpen?: () => HTMLElement | null | void
  className?: string
  children: ReactNode
}) {
  const modal = useSubscribeModal()

  if (!modal) {
    return null
  }

  return (
    <button
      type="button"
      aria-haspopup="dialog"
      onClick={(event) => {
        const button = event.currentTarget
        const returnFocus = onBeforeOpen?.() || button

        modal.open({ returnFocus })
      }}
      className={buttonClasses({ variant, size, fullWidth, motion, className })}
    >
      {children}
    </button>
  )
}
