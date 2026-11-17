import { type ReactNode } from 'react'

import { Breadcrumb, type BreadcrumbItem } from '@/components/ui/Breadcrumb'
import { cx } from '@/components/ui/cx'

/**
 * Breadcrumb, the page title (or the heading category's or topic's) and its intro, 728px wide at most. `titleAside`
 * (the "Select a topic" hint) follows the H1 in a wrapping row, 16px after it (8px between wrapped lines).
 */
export function CategoriesHeader({
  title,
  intro,
  breadcrumb,
  titleAside,
  className,
}: {
  title: string
  intro: string | null
  breadcrumb: BreadcrumbItem[]
  titleAside?: ReactNode
  className?: string
}) {
  const heading = <h1 className="min-w-0 text-heading-section font-medium wrap-anywhere">{title}</h1>

  return (
    <header className={cx('flex flex-col gap-6', className)}>
      <Breadcrumb items={breadcrumb} />
      <div className="flex max-w-182 flex-col gap-3">
        {titleAside ? (
          <div className="relative flex min-w-0 flex-wrap items-center gap-x-4 gap-y-2">
            {heading}
            {titleAside}
          </div>
        ) : (
          heading
        )}
        {intro && <p className="text-base leading-copy text-pretty text-grey">{intro}</p>}
      </div>
    </header>
  )
}
