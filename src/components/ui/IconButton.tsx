import { type MouseEventHandler, type Ref } from 'react'

import { cx } from './cx'
import { Icon, type IconName } from './Icon'
import { EASE, HEADER_EASE, type Motion } from './motion'

// Design: 44px touch target on mobile and tablet, 32px in the desktop header (from the `header` breakpoint).
const SIZES = {
  md: 'size-11',
  sm: 'size-11 header:size-8',
}

const VARIANTS = {
  surface: 'hover:bg-surface-hover',
  fade: 'hover:opacity-60',
  // Tinted hover below the header breakpoint, fade from it (ClearView header search).
  'surface-fade': 'hover:bg-surface-hover header:hover:bg-transparent header:hover:opacity-60',
  // No hover below the header breakpoint, fade from it (ClearView close-search).
  'fade-header': 'header:hover:opacity-60',
  none: '',
}

export function IconButton({
  icon,
  label,
  size = 'md',
  variant = 'surface',
  pressed = false,
  expanded,
  controls,
  type = 'button',
  tabIndex,
  motion = 'smooth',
  ref,
  onClick,
  className,
}: {
  icon: IconName
  label: string
  size?: keyof typeof SIZES
  variant?: keyof typeof VARIANTS
  pressed?: boolean
  // Disclosure state (`aria-expanded`) and the id of the element it controls.
  expanded?: boolean
  controls?: string
  type?: 'button' | 'submit'
  tabIndex?: number
  // Hover easing, see motion.ts; `header` switches at the header breakpoint.
  motion?: Motion | 'header'
  ref?: Ref<HTMLButtonElement>
  onClick?: MouseEventHandler<HTMLButtonElement>
  className?: string
}) {
  return (
    <button
      ref={ref}
      type={type}
      aria-label={label}
      aria-expanded={expanded}
      aria-controls={controls}
      tabIndex={tabIndex}
      onClick={onClick}
      className={cx(
        'inline-flex shrink-0 cursor-pointer items-center justify-center rounded-sm text-foreground transition',
        motion === 'header' ? HEADER_EASE : EASE[motion],
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
