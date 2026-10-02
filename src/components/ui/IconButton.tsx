import { type MouseEventHandler } from 'react'

import { cx } from './cx'
import { Icon, type IconName } from './Icon'

// Design: 44px touch target on mobile and tablet, 32px in the desktop header.
const SIZES = {
  md: 'size-11',
  sm: 'size-11 lg:size-8',
}

const VARIANTS = {
  surface: 'hover:bg-surface-hover',
  fade: 'hover:opacity-60',
}

export function IconButton({
  icon,
  label,
  size = 'md',
  variant = 'surface',
  pressed = false,
  type = 'button',
  onClick,
  className,
}: {
  icon: IconName
  label: string
  size?: keyof typeof SIZES
  variant?: keyof typeof VARIANTS
  pressed?: boolean
  type?: 'button' | 'submit'
  onClick?: MouseEventHandler<HTMLButtonElement>
  className?: string
}) {
  return (
    <button
      type={type}
      aria-label={label}
      onClick={onClick}
      className={cx(
        'inline-flex shrink-0 cursor-pointer items-center justify-center rounded-sm text-foreground transition duration-180 ease-smooth',
        SIZES[size],
        VARIANTS[variant],
        pressed && 'bg-surface-hover',
        className,
      )}
    >
      <Icon name={icon} />
    </button>
  )
}
