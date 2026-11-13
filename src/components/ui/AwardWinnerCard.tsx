import Image from 'next/image'
import Link from 'next/link'

import { cx } from './cx'
import { Icon } from './Icon'
import { isSvg, type MediaImage } from './Media'

/**
 * One award winner (shared-shell award-winner-card): "2025 winner", the winner's name, an optional note under it and
 * the logo with a chevron on the right. A bordered whole-card link: on hover the surface tints, the ring darkens, the
 * name turns accent and the chevron moves 2px, 180ms ease-out. Without href it renders the same box with no hover.
 */
export function AwardWinnerCard({
  href,
  label,
  name,
  note,
  logo,
  className,
}: {
  href?: string | null
  /** The year line above the name, e.g. "2025 winner". */
  label: string
  name: string
  /** A third line, e.g. the category group when one year's winners sit in different groups. */
  note?: string | null
  logo?: MediaImage | null
  className?: string
}) {
  const classes = cx(
    'group flex min-w-0 items-stretch justify-between gap-x-8 gap-y-4 rounded-sm bg-white p-6 inset-ring inset-ring-border',
    href &&
      'transition duration-180 ease-out hover:bg-surface-hover hover:inset-ring-border-plus focus-visible:outline-none focus-visible:inset-ring-2 focus-visible:inset-ring-focus',
    className,
  )

  const content = (
    <>
      <span className="flex min-w-0 flex-auto flex-col gap-3">
        <span className="text-caption leading-none text-grey">{label}</span>
        <span
          className={cx(
            'text-title-lg font-medium wrap-anywhere text-pretty text-foreground',
            href && 'transition-colors duration-180 ease-out group-hover:text-accent',
          )}
        >
          {name}
        </span>
        {note && <span className="text-caption text-grey">{note}</span>}
      </span>
      <span className="flex shrink-0 flex-col items-end justify-between gap-4">
        {logo && (
          // A logo sits beside the name, which already says who won; its alt comes from the media library.
          <Image
            src={logo.src}
            width={logo.width}
            height={logo.height}
            alt={logo.alt}
            // 48px high, at most a 4:1 wordmark wide: 192px.
            sizes="192px"
            unoptimized={isSvg(logo.src)}
            className="block h-12 w-auto max-w-48 object-contain"
          />
        )}
        {href && (
          <Icon
            name="card-chevron"
            className="mt-auto text-foreground transition duration-180 ease-out group-hover:translate-x-0.5 group-hover:text-accent"
          />
        )}
      </span>
    </>
  )

  if (!href) {
    return <div className={classes}>{content}</div>
  }

  return (
    <Link href={href} prefetch={false} className={classes}>
      {content}
    </Link>
  )
}
