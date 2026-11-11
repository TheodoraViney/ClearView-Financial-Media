import { Breadcrumb, type BreadcrumbItem } from '@/components/ui/Breadcrumb'
import { cx } from '@/components/ui/cx'

/** Breadcrumb, the page title (or the heading category's or topic's) and its intro, 728px wide at most. */
export function CategoriesHeader({
  title,
  intro,
  breadcrumb,
  className,
}: {
  title: string
  intro: string | null
  breadcrumb: BreadcrumbItem[]
  className?: string
}) {
  return (
    <header className={cx('flex flex-col gap-6', className)}>
      <Breadcrumb items={breadcrumb} />
      <div className="flex max-w-182 flex-col gap-3">
        <h1 className="text-heading-section font-medium wrap-anywhere">{title}</h1>
        {intro && <p className="text-base leading-copy text-pretty text-grey">{intro}</p>}
      </div>
    </header>
  )
}
