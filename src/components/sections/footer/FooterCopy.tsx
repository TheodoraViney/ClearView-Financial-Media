import { cx } from '@/components/ui/cx'

/** The copyright row of the masters: description, the optional publisher line, then the copyright. */
export function FooterCopy({
  description,
  publisherLine,
  copyright,
  className,
}: {
  description: string
  publisherLine?: string
  copyright: string
  // Gap and max width differ per footer type.
  className?: string
}) {
  return (
    <div className={cx('flex flex-col self-stretch text-sm leading-normal text-grey', className)}>
      {description && <p className="text-pretty">{description}</p>}
      {publisherLine && <p className="font-medium text-foreground">{publisherLine}</p>}
      {copyright && <p>{copyright}</p>}
    </div>
  )
}
