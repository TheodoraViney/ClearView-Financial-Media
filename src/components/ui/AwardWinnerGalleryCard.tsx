import Link from 'next/link'

import { Media, type MediaImage } from './Media'

/**
 * shared-shell award-winner-gallery-card (`mpu`): a 300:250 bordered card, padding 24, gap 20. The category (13/18.2
 * grey) links to its award category page when it has one; the logo panel (`surface-subtle`, min 96, padding 16)
 * fills the middle with the logo contained at 56 high, or the company name as an 18/22 wordmark; then the winner's
 * name (16/20.8 500) and an optional organisation. The card itself is not a link.
 * 300:250 is the minimum: a long category or name makes the card taller, never overflow it. The wordmark stops at
 * three lines and the name at two, with an ellipsis; the full name stays in the text for screen readers.
 */
export function AwardWinnerGalleryCard({
  category,
  categoryHref,
  name,
  organisation,
  wordmark,
  logo,
}: {
  category: string
  categoryHref?: string | null
  name: string
  organisation?: string | null
  /** The wordmark when there is no logo, e.g. the company of a person's award; defaults to the organisation or name. */
  wordmark?: string | null
  logo?: MediaImage | null
}) {
  return (
    <article className="flex aspect-6/5 w-full min-w-0 flex-col gap-5 rounded-sm bg-white p-6 inset-ring inset-ring-border">
      {categoryHref ? (
        <Link
          href={categoryHref}
          prefetch={false}
          className="self-start text-caption text-pretty text-grey transition-colors duration-180 ease-out hover:text-accent"
        >
          {category}
        </Link>
      ) : (
        <span className="text-caption text-pretty text-grey">{category}</span>
      )}
      <div className="flex min-h-24 min-w-0 flex-1 items-center justify-center rounded-sm bg-surface-subtle p-4">
        {logo ? (
          // The name is written under the logo, so the logo is not announced again. Card inner width: 300 - 48 - 32.
          <Media image={{ ...logo, alt: '' }} sizes="320px" fit="contain-center" className="h-14 w-full" />
        ) : (
          <span
            aria-hidden="true"
            className="max-w-full text-center text-headline font-medium tracking-wordmark text-balance text-foreground wrap-anywhere line-clamp-3"
          >
            {wordmark || organisation || name}
          </span>
        )}
      </div>
      <div className="flex min-w-0 flex-col gap-1">
        <span className="text-base leading-title font-medium text-pretty text-foreground wrap-anywhere line-clamp-2">{name}</span>
        {organisation && <span className="text-caption text-pretty text-grey">{organisation}</span>}
      </div>
    </article>
  )
}
