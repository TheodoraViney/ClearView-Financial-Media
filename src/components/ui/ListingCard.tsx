import Link from 'next/link'

import { cx } from './cx'
import { Media, type MediaImage } from './Media'
import { Meta } from './Meta'

/**
 * How the picture band shows the record's image:
 * - `wordmark`: awards edition and event logos, wide wordmarks on their own dark ground. They sit contained, unpadded,
 *   on `foreground`, which fills the rest of the 80px band.
 * - `cover`: a research report cover (portrait), contained and centred on `light` in a 160px band.
 * A record without an image gets a neutral band of the same height, so the cards of a row line up.
 */
const BANDS = {
  wordmark: { height: 'h-20', ground: 'bg-foreground' },
  cover: { height: 'h-40', ground: 'bg-light' },
} as const

export type ListingCardImageKind = keyof typeof BANDS

/**
 * One record of a shared listing as a compact bordered card: the picture band (decorative, the title names the
 * record), the title (a link, accent on hover; plain text without href), then the date, the region and the status tag
 * (accent when highlighted) on one meta line at the card's foot. Cards in a grid row stretch to the same height.
 */
export function ListingCard({
  href,
  title,
  meta,
  status,
  statusLabel,
  image,
  imageKind,
}: {
  href: string | null
  title: string
  meta: string[]
  status?: { label: string; highlight: boolean } | null
  /** Screen-reader prefix of the status tag, e.g. "Status: ". */
  statusLabel?: string
  image: MediaImage | null
  imageKind: ListingCardImageKind
}) {
  const band = BANDS[imageKind]

  return (
    <article className="flex min-w-0 flex-1 flex-col gap-3 rounded-sm bg-white p-4 inset-ring inset-ring-border">
      {image ? (
        <div className={cx('w-full shrink-0 overflow-hidden rounded-sm', band.height, band.ground)}>
          <Media image={{ ...image, alt: '' }} sizes="320px" fit="contain-center" placeholder={false} className="size-full" />
        </div>
      ) : (
        <div aria-hidden className={cx('w-full shrink-0 rounded-sm bg-light', band.height)} />
      )}
      <h3 className="text-base leading-copy font-medium text-pretty wrap-anywhere">
        {href ? (
          <Link href={href} prefetch={false} className="transition-colors duration-180 ease-out hover:text-accent">
            {title}
          </Link>
        ) : (
          title
        )}
      </h3>
      {(meta.length > 0 || status) && (
        <Meta
          items={meta}
          spacing="relaxed"
          tag={status && <span className={status.highlight ? 'text-accent' : undefined}>{status.label}</span>}
          tagLabel={statusLabel}
          tagPosition="end"
          className="mt-auto leading-none"
        />
      )}
    </article>
  )
}
