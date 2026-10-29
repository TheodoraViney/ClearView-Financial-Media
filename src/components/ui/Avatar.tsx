import { cx } from './cx'
import { Media, type MediaImage } from './Media'

// 40px round portrait. Without a photo it shows the initials on the brand tint.
const TEXT = {
  sm: 'text-caption leading-none',
  lg: 'text-title-lg',
}

export function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}

export function Avatar({
  name,
  image,
  text = 'sm',
  className,
}: {
  name: string
  image?: MediaImage | null
  text?: keyof typeof TEXT
  className?: string
}) {
  if (image) {
    return <Media image={{ ...image, alt: '' }} sizes="40px" thumb="sm" className={cx('rounded-full', className)} />
  }

  return (
    <span
      aria-hidden="true"
      className={cx(
        'flex size-10 shrink-0 items-center justify-center rounded-full bg-surface-hover font-medium text-accent ring-1 ring-accent-subtle ring-inset',
        TEXT[text],
        className,
      )}
    >
      {initialsOf(name)}
    </span>
  )
}
