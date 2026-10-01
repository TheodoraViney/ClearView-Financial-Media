import { type ComponentProps } from 'react'

import { cx } from './cx'

const VARIANTS = {
  default:
    'h-12.5 rounded-sm bg-white px-4 inset-ring inset-ring-input focus:inset-ring-focus aria-invalid:inset-ring-error',
  bare: 'h-full bg-transparent',
}

export function Input({
  variant = 'default',
  className,
  ...props
}: { variant?: keyof typeof VARIANTS } & Omit<ComponentProps<'input'>, 'size'>) {
  return (
    <input
      {...props}
      className={cx(
        'min-w-0 border-0 text-base leading-copy text-foreground outline-none transition-shadow duration-180 ease-smooth placeholder:text-foreground/50',
        VARIANTS[variant],
        className,
      )}
    />
  )
}
