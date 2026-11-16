'use client'

import { stegaClean } from 'next-sanity'
import { useId, useState } from 'react'

import { ConsentEmbed, type EmbedConsentCopy } from '@/components/ui/ConsentEmbed.client'
import { cx } from '@/components/ui/cx'
import { Dialog } from '@/components/ui/Dialog.client'
import { Icon } from '@/components/ui/Icon'
import { Media, type MediaImage } from '@/components/ui/Media'

/**
 * The highlight video thumbnail and its lightbox. The thumbnail is a 16:9 button (poster, foreground/24 veil, a 48px
 * white play circle with an accent triangle that inverts on hover, 180ms ease-out). It opens `Dialog variant="media"`
 * with the title and the Vimeo player, which loads only once the reader allows functional cookies (ConsentEmbed).
 */
export function HighlightVideo({
  title,
  name,
  thumbnail,
  playerSrc,
  consent,
  playLabel,
  closeLabel,
  className,
}: {
  /** The section heading, repeated above the player. Without it the dialog's name is for screen readers only. */
  title: string | null
  /** The player's accessible name. */
  name: string
  thumbnail: MediaImage | null
  playerSrc: string
  consent: EmbedConsentCopy
  playLabel: string
  closeLabel: string
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const titleId = useId()
  // Attributes carry no Visual Editing markers.
  const playerName = stegaClean(name)

  return (
    <>
      <button
        type="button"
        aria-label={stegaClean(playLabel)}
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
        className={cx(
          'group relative block aspect-video w-full min-w-0 cursor-pointer overflow-hidden rounded-sm bg-foreground',
          className,
        )}
      >
        {thumbnail && (
          // From the header breakpoint 4 of 12 columns of the main column (~295), below it at most 360.
          <span className="absolute inset-0">
            <Media image={{ ...thumbnail, alt: '' }} sizes="360px" className="size-full" />
          </span>
        )}
        <span aria-hidden="true" className="absolute inset-0 bg-foreground/24" />
        <span
          aria-hidden="true"
          className="absolute top-1/2 left-1/2 flex size-12 -translate-1/2 items-center justify-center rounded-full bg-white text-accent shadow-play transition-colors duration-180 ease-out group-hover:bg-accent group-hover:text-white"
        >
          <Icon name="play" className="ml-0.5" />
        </span>
      </button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        labelledBy={titleId}
        closeLabel={closeLabel}
        variant="media"
        title={
          // Without a heading the dialog still needs a name, read by screen readers only.
          <p id={titleId} className={cx('min-w-0 text-base leading-title font-medium text-white', !title && 'sr-only')}>
            {title ?? playerName}
          </p>
        }
      >
        <div className="relative aspect-video w-full overflow-hidden rounded-sm bg-foreground shadow-lightbox">
          {open && (
            <ConsentEmbed
              src={playerSrc}
              title={playerName}
              copy={consent}
              onOpenSettings={() => setOpen(false)}
              className="absolute inset-0 size-full"
            />
          )}
        </div>
      </Dialog>
    </>
  )
}
