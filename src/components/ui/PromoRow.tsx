import Link from 'next/link'

import { cx } from './cx'
import { Icon } from './Icon'
import { Media } from './Media'

const VARIANTS = {
  default: {
    root: 'border-t border-border hover:bg-surface-hover',
    title: 'text-foreground',
    description: 'text-grey',
  },
  inverse: {
    root: 'border-t border-white/20 bg-white/5 hover:bg-white/10',
    title: 'text-white',
    description: 'text-white/50',
  },
}

// Footer row of a sidebar block. With downloadHref the title and the download chip are separate links.
export function PromoRow({
  href,
  title,
  description,
  image,
  report = false,
  downloadHref,
  variant = 'default',
  className,
}: {
  href: string
  title: string
  description: string
  image?: string | null
  report?: boolean
  downloadHref?: string
  variant?: keyof typeof VARIANTS
  className?: string
}) {
  const styles = VARIANTS[variant]
  const classes = cx(
    'group flex items-start gap-4 px-4 py-6 transition-colors duration-180 ease-smooth md:gap-6 md:px-8',
    styles.root,
    className,
  )

  const body = (
    <>
      <Media src={image} alt={title} thumb={report ? 'report' : 'sm'} />
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex items-start gap-2">
          {downloadHref ? (
            <Link
              href={href}
              className={cx(
                'min-w-0 flex-1 text-base leading-title font-medium transition-colors duration-180 ease-smooth hover:text-grey',
                styles.title,
              )}
            >
              {title}
            </Link>
          ) : (
            <>
              <span
                className={cx(
                  'flex-1 text-base leading-title font-medium',
                  styles.title,
                )}
              >
                {title}
              </span>
              <span className={cx('flex h-5 items-center', styles.title)}>
                <Icon
                  name="chevron-right"
                  className="transition-transform duration-180 ease-smooth group-hover:translate-x-0.75"
                />
              </span>
            </>
          )}
          {downloadHref && (
            <Link
              href={downloadHref}
              aria-label={`Download ${title}`}
              className="-m-2.75 flex size-11 shrink-0 items-center justify-center lg:m-0 lg:size-5.5"
            >
              <span className="flex size-5.5 items-center justify-center rounded-full bg-light text-accent transition-colors duration-180 ease-smooth hover:bg-border-plus">
                <Icon name="download" />
              </span>
            </Link>
          )}
        </div>
        <span className={cx('text-caption leading-copy', styles.description)}>
          {description}
        </span>
      </div>
    </>
  )

  if (downloadHref) {
    return <div className={classes}>{body}</div>
  }

  return (
    <Link href={href} className={classes}>
      {body}
    </Link>
  )
}
