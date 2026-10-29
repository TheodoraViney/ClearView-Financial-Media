'use client'

import { type ReactNode } from 'react'

import { buttonClasses, type ButtonSize, type ButtonVariant } from './Button'
import { type Motion } from './motion'

// A `Button` that runs a handler on click, for client components (article Share and Copy link). `Button` itself
// stays server-safe: it takes no event handlers. Same variants and sizes.
export function ActionButton({
  onClick,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  motion = 'smooth',
  className,
  children,
}: {
  onClick: () => void
  variant?: ButtonVariant
  size?: ButtonSize
  fullWidth?: boolean
  motion?: Motion
  className?: string
  children: ReactNode
}) {
  return (
    <button type="button" onClick={onClick} className={buttonClasses({ variant, size, fullWidth, motion, className })}>
      {children}
    </button>
  )
}
