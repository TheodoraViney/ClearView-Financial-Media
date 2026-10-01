import { type ReactNode } from 'react'

import { cx } from './cx'

export function Container({
  className,
  children,
}: {
  className?: string
  children: ReactNode
}) {
  return (
    <div className={cx('mx-auto w-full max-w-page px-gutter', className)}>
      {children}
    </div>
  )
}
