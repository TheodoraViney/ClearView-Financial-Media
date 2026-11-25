import Link from 'next/link'

import { ArrowLink } from './ArrowLink'
import { Badge } from './Badge'
import { cx } from './cx'
import { Media, type MediaImage } from './Media'

// Logo heights inside the 48px logo area, by the logo's shape (as PartnerCard): wide wordmarks small, squarer marks
// large, so the logos look about the same size across a grid.
const LOGO_HEIGHTS = { small: 'h-6', medium: 'h-9', large: 'h-12' }

function logoSize({ width, height }: MediaImage): keyof typeof LOGO_HEIGHTS {
  const ratio = height > 0 ? width / height : 1

  return ratio >= 5 ? 'small' : ratio >= 2 ? 'medium' : 'large'
}

/**
 * shared-shell company-card (Company Engagement): the whole card is one link, padding 24, radius 4, a 1px `border`
 * ring; parts 24 apart. Top row: the logo (48px area, contained, left-aligned, at most the card's width) and, on the
 * right, the type label and the year (a rule between them when both show), 13/13 grey. Then the title 20/24 500 and
 * the description 16/22.4 grey, cut at three lines (8 apart); the tags (neutral `Badge`, gap 8); the link text in the
 * accent with the chevron, pinned to the bottom. Hover: `surface-subtle` with a `border-plus` ring and the title in the
 * accent; keyboard focus adds a 2px `focus` ring. 180ms ease-out. Without a logo, type label and year, the top row is
 * left out (no placeholder). The logo is decorative: `label` names the link.
 */
export function CompanyCard({
  href,
  title,
  label,
  logo,
  metaLabel,
  year,
  description,
  tags,
  cta,
}: {
  href: string
  title: string
  /** The link's accessible name, plain text. */
  label: string
  logo: MediaImage | null
  metaLabel?: string | null
  year?: string | null
  description?: string | null
  tags: { key: string; label: string }[]
  cta: string
}) {
  const meta = Boolean(metaLabel || year)

  return (
    <Link
      href={href}
      prefetch={false}
      aria-label={label}
      className="group flex h-full w-full min-w-0 flex-col gap-6 rounded-sm bg-white p-6 text-foreground inset-ring inset-ring-border transition duration-180 ease-out hover:bg-surface-subtle hover:text-accent hover:inset-ring-border-plus focus-visible:inset-ring-2 focus-visible:inset-ring-focus"
    >
      {(logo || meta) && (
        <span className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
          {logo && (
            <span className="flex h-12 max-w-full items-center">
              {/* The box takes the logo's own ratio so it sits left; at most the card's width (inner ~350 on desktop). */}
              <span
                className={cx('block max-w-full', LOGO_HEIGHTS[logoSize(logo)])}
                style={{ aspectRatio: `${logo.width} / ${logo.height}` }}
              >
                <Media image={{ ...logo, alt: '' }} sizes="360px" fit="contain" className="size-full" />
              </span>
            </span>
          )}
          {meta && (
            <span className="ml-auto flex flex-wrap items-center justify-end gap-2 pt-1 text-caption leading-none text-grey">
              {metaLabel && <span className="whitespace-nowrap">{metaLabel}</span>}
              {year && <span className={cx('inline-flex h-3.25 items-center', metaLabel && 'border-l border-border pl-2')}>{year}</span>}
            </span>
          )}
        </span>
      )}
      <span className="flex flex-col gap-2">
        <span className="text-title-lg font-medium text-pretty wrap-anywhere">{title}</span>
        {description && <span className="line-clamp-3 text-base leading-copy text-grey">{description}</span>}
      </span>
      {tags.length > 0 && (
        <span className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <Badge key={tag.key} layout="wrap">
              {tag.label}
            </Badge>
          ))}
        </span>
      )}
      <ArrowLink variant="accent" hover="static" className="mt-auto">
        {cta}
      </ArrowLink>
    </Link>
  )
}
