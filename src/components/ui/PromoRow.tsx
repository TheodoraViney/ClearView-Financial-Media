import Link from 'next/link'

import { cx } from './cx'
import { Icon } from './Icon'
import { Media } from './Media'
import { CHEVRON, EASE, type Motion } from './motion'

const VARIANTS = {
  default: {
    root: 'border-t border-border',
    hover: 'hover:bg-surface-hover',
    hoverLg: 'lg:hover:bg-surface-hover',
    title: 'text-foreground',
    description: 'text-grey',
  },
  inverse: {
    root: 'border-t border-white/20 bg-white/5',
    hover: 'hover:bg-white/10',
    hoverLg: 'lg:hover:bg-white/10',
    title: 'text-white',
    description: 'text-white/50',
  },
}

// Footer row of a sidebar block. With downloadHref the title and the download chip are separate links.
// Without href the title is plain text and, without downloadHref too, the row has no hover state or chevron.
// `alt` defaults to decorative: in the whole-row link the title already names the image (alt rule, 2026-10-02).
// `motion="responsive"` follows the responsive design file below lg: ease-out, static chevron, and a download row
// with no row or chip hover and an instant title colour change. From lg it matches the default. See motion.ts.
export function PromoRow({
  href,
  title,
  description,
  image,
  alt = '',
  report = false,
  downloadHref,
  variant = 'default',
  motion = 'smooth',
  className,
}: {
  href?: string | null
  title: string
  description?: string | null
  image?: string | null
  alt?: string
  report?: boolean
  downloadHref?: string
  variant?: keyof typeof VARIANTS
  motion?: Motion
  className?: string
}) {
  const styles = VARIANTS[variant]
  const responsive = motion === 'responsive'
  const classes = cx(
    'group flex items-start gap-4 px-4 py-6 transition-colors md:gap-6 md:px-8',
    EASE[motion],
    styles.root,
    href && (responsive && downloadHref ? styles.hoverLg : styles.hover),
    className,
  )

  const body = (
    <>
      <Media src={image} alt={alt} thumb={report ? 'report' : 'sm'} />
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex items-start gap-2">
          {downloadHref && href ? (
            <Link
              href={href}
              className={cx(
                'min-w-0 flex-1 text-base leading-title font-medium hover:text-grey',
                responsive
                  ? 'transition-none lg:transition-colors lg:duration-180 lg:ease-smooth'
                  : 'transition-colors duration-180 ease-smooth',
                styles.title,
              )}
            >
              {title}
            </Link>
          ) : downloadHref || !href ? (
            <span className={cx('min-w-0 flex-1 text-base leading-title font-medium', styles.title)}>{title}</span>
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
                <Icon name="chevron-right" className={CHEVRON[motion]} />
              </span>
            </>
          )}
          {downloadHref && (
            <Link
              href={downloadHref}
              aria-label={`Download ${title}`}
              className="-m-2.75 flex size-11 shrink-0 items-center justify-center lg:m-0 lg:size-5.5"
            >
              <span
                className={cx(
                  'flex size-5.5 items-center justify-center rounded-full bg-light text-accent',
                  responsive
                    ? 'lg:transition-colors lg:duration-180 lg:ease-smooth lg:hover:bg-border-plus'
                    : 'transition-colors duration-180 ease-smooth hover:bg-border-plus',
                )}
              >
                <Icon name="download" />
              </span>
            </Link>
          )}
        </div>
        {description && (
          <span className={cx('text-caption leading-copy', styles.description)}>{description}</span>
        )}
      </div>
    </>
  )

  if (downloadHref || !href) {
    return <div className={classes}>{body}</div>
  }

  return (
    <Link href={href} className={classes}>
      {body}
    </Link>
  )
}
