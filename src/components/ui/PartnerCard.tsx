import { cx } from './cx'
import { Icon } from './Icon'
import { Media, type MediaImage } from './Media'

// Logo heights (shared-shell event-partner-card `logo-size`): wide wordmarks small, squarer marks large, so the
// logos look about the same size on a row of cards.
const LOGO_HEIGHTS = { small: 'h-6', medium: 'h-9', large: 'h-16' }

function logoSize({ width, height }: MediaImage): keyof typeof LOGO_HEIGHTS {
  const ratio = height > 0 ? width / height : 1

  return ratio >= 5 ? 'small' : ratio >= 2 ? 'medium' : 'large'
}

// The hover swap's classes, one set per `hoverFrom`: on any device that hovers (`can-hover`), or only from the header
// breakpoint (`header:can-hover`; below it every device shows the static card). Written out in full for Tailwind.
const HOVER = {
  any: {
    card: 'can-hover:hover:bg-surface-subtle can-hover:hover:inset-ring-border-plus can-hover:focus-visible:bg-surface-subtle can-hover:focus-visible:inset-ring-border-plus',
    logo: 'can-hover:absolute can-hover:inset-0 can-hover:justify-center can-hover:pb-6 can-hover:group-hover:opacity-0 can-hover:group-focus-visible:opacity-0',
    details:
      'can-hover:pt-6 can-hover:opacity-0 can-hover:group-hover:opacity-100 can-hover:group-focus-visible:opacity-100',
    name: 'can-hover:group-hover:text-accent can-hover:group-focus-visible:text-accent',
    chevron:
      'can-hover:group-hover:translate-x-0.5 can-hover:group-hover:text-accent can-hover:group-focus-visible:translate-x-0.5 can-hover:group-focus-visible:text-accent',
  },
  header: {
    card: 'header:can-hover:hover:bg-surface-subtle header:can-hover:hover:inset-ring-border-plus header:can-hover:focus-visible:bg-surface-subtle header:can-hover:focus-visible:inset-ring-border-plus',
    logo: 'header:can-hover:absolute header:can-hover:inset-0 header:can-hover:justify-center header:can-hover:pb-6 header:can-hover:group-hover:opacity-0 header:can-hover:group-focus-visible:opacity-0',
    details:
      'header:can-hover:pt-6 header:can-hover:opacity-0 header:can-hover:group-hover:opacity-100 header:can-hover:group-focus-visible:opacity-100',
    name: 'header:can-hover:group-hover:text-accent header:can-hover:group-focus-visible:text-accent',
    chevron:
      'header:can-hover:group-hover:translate-x-0.5 header:can-hover:group-hover:text-accent header:can-hover:group-focus-visible:translate-x-0.5 header:can-hover:group-focus-visible:text-accent',
  },
}

const CARD = 'relative flex h-full min-h-40 w-full min-w-0 flex-col rounded-sm bg-white inset-ring inset-ring-border'

/** The logo at its size, contained in a box of its own aspect ratio, or the name as a 20/24 wordmark without one. */
function Logo({ name, alt, logo, decorative }: { name: string; alt: string; logo: MediaImage | null; decorative: boolean }) {
  if (!logo) {
    return (
      <span
        aria-hidden={decorative || undefined}
        className="max-w-full text-center text-title-lg font-medium text-balance wrap-anywhere text-foreground"
      >
        {name}
      </span>
    )
  }

  return (
    // The box takes the logo's own ratio so it can sit left or centred; at most the card's width (inner ~280).
    <span className={cx('block max-w-full', LOGO_HEIGHTS[logoSize(logo)])} style={{ aspectRatio: `${logo.width} / ${logo.height}` }}>
      <Media
        image={{ ...logo, alt: decorative ? '' : alt }}
        sizes="320px"
        fit="contain-center"
        className="size-full"
      />
    </span>
  )
}

/**
 * shared-shell event-partner-card: a sponsor or partner, min 160 high, radius 4, a 1px inset `border` ring.
 * With `href` the card links to the partner's website (a new tab): on a device that hovers, the centred logo gives way
 * on hover and on keyboard focus to the name (16/20.8 500, accent), the description (13/18.2 grey, at most three lines)
 * and a chevron at the bottom right, over `surface-subtle` with a `border-plus` ring, 180ms ease-out (instant with
 * reduced motion). On touch screens the card shows the logo above the name and description at once, and so does every
 * device below the header breakpoint with `hoverFrom="header"` (event page v1.2: the swap is desktop only). Without `href`
 * the card is not a link: it shows the logo only, the name as its text alternative. Without a logo the name stands in
 * its place.
 */
export function PartnerCard({
  name,
  label = name,
  logo,
  description,
  href,
  hoverFrom = 'any',
}: {
  name: string
  /** The name as plain text, without Visual Editing markers: the logo's alt text and the link's accessible name. */
  label?: string
  logo: MediaImage | null
  description?: string | null
  href?: string | null
  hoverFrom?: keyof typeof HOVER
}) {
  if (!href) {
    return (
      <div className={cx(CARD, 'items-center justify-center p-6')}>
        <Logo name={name} alt={label} logo={logo} decorative={false} />
      </div>
    )
  }

  const motion = 'transition duration-180 ease-out motion-reduce:transition-none'
  const hover = HOVER[hoverFrom]

  return (
    // Named by the company alone: the description inside would otherwise be read as part of the link.
    <a
      href={href}
      aria-label={label}
      target="_blank"
      rel="noopener noreferrer"
      className={cx(
        CARD,
        'group',
        motion,
        hover.card,
      )}
    >
      {/* The logo: in the flow on touch screens, a centred layer under the details on a device that hovers. */}
      <span
        aria-hidden="true"
        className={cx(
          'pointer-events-none flex items-center px-6 pt-6',
          hover.logo,
          motion,
        )}
      >
        <Logo name={name} alt={label} logo={logo} decorative />
      </span>
      <span
        className={cx(
          'flex flex-1 flex-col gap-3 px-6 pt-4 pb-6',
          hover.details,
          motion,
        )}
      >
        <span
          className={cx(
            'text-base leading-title font-medium wrap-anywhere text-foreground',
            hover.name,
            motion,
          )}
        >
          {name}
        </span>
        {description && <span className="line-clamp-3 text-caption text-pretty text-grey">{description}</span>}
        <Icon
          name="card-chevron"
          className={cx(
            'mt-auto shrink-0 self-end text-foreground',
            hover.chevron,
            motion,
          )}
        />
      </span>
    </a>
  )
}
