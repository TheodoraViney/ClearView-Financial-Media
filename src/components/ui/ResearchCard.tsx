import Image from 'next/image'
import Link from 'next/link'
import { type ReactNode, useId } from 'react'

import { isSvg, type MediaImage } from './Media'
import { Meta } from './Meta'

// The cover is 200px high; its width follows the cover, at most the frame.
const COVER_HEIGHT = 200

/**
 * related-research-card: a whole-card link with a `border` frame. On top a `surface-thumb` frame (40 / 24 inside)
 * with the contained cover, 200 high, `shadow-cover`; below (24 inside, 16 apart) the meta line and the title
 * 16/20.8 500. Hover and keyboard focus: the cover grows to 1.05 with the accent-tinted `shadow-cover-hover` (600ms
 * `ease-smooth`, no zoom with reduced motion) and the title turns accent (180ms). The link is named by the title.
 */
export function ResearchCard({
  href,
  title,
  meta,
  cover,
}: {
  href: string | null
  title: string
  meta: ReactNode[]
  cover: MediaImage | null
}) {
  const titleId = useId()
  const classes = 'group flex h-full min-w-0 flex-col overflow-hidden rounded-sm border border-border bg-white text-foreground'

  const content = (
    <>
      <span className="flex shrink-0 items-center justify-center overflow-hidden bg-surface-thumb px-6 py-10">
        {cover && (
          <Image
            src={cover.src}
            alt=""
            width={Math.round((COVER_HEIGHT * cover.width) / cover.height)}
            height={COVER_HEIGHT}
            unoptimized={isSvg(cover.src)}
            // 200px high, as wide as the cover's ratio allows (about 140 for an A4 cover).
            sizes={`${Math.min(Math.ceil((COVER_HEIGHT * cover.width) / cover.height), 640)}px`}
            className="block h-50 w-auto max-w-full rounded-sm object-contain shadow-cover transition duration-600 ease-smooth group-hover:shadow-cover-hover group-focus-visible:shadow-cover-hover motion-safe:group-hover:scale-105 motion-safe:group-focus-visible:scale-105"
          />
        )}
      </span>
      <span className="flex flex-1 flex-col gap-4 p-6">
        {meta.length > 0 && <Meta items={meta} className="leading-none" />}
        <span
          id={titleId}
          className="text-base leading-title font-medium text-pretty wrap-anywhere transition-colors duration-180 ease-out group-hover:text-accent group-focus-visible:text-accent"
        >
          {title}
        </span>
      </span>
    </>
  )

  return href ? (
    <Link href={href} prefetch={false} aria-labelledby={titleId} className={classes}>
      {content}
    </Link>
  ) : (
    <div className={classes}>{content}</div>
  )
}
