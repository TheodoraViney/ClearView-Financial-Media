'use client'

import { stegaClean } from 'next-sanity'
import { useId, useState, type ReactNode } from 'react'

import { Avatar } from './Avatar'
import { Dialog } from './Dialog.client'
import type { MediaImage } from './Media'

/**
 * shared-shell speaker-card `bio-display="modal"`: the name, in the accent and fading to 60% on hover (180ms
 * ease-out), is a button that opens the biography in `Dialog variant="panel"`. The dialog's header: the portrait (80 /
 * 112 from md) beside the name (h2 20/24 500), role (16/22.4 grey) and organisation (16/22.4 dark), 16 / 24 apart from
 * md; the biography 32 below it, at most 640 wide. The card is padded 24 / 40 from md. Closing returns focus to the
 * name (the dialog returns focus to the element focused before). `nameAs` is the name's heading level on the card.
 */
export function SpeakerBioDialog({
  name,
  nameAs: Name,
  role,
  organisation,
  photo,
  bio,
  openLabel,
  closeLabel,
}: {
  name: string
  nameAs: 'h3' | 'h4'
  role?: string | null
  organisation?: string | null
  photo?: MediaImage | null
  bio: ReactNode
  /** Accessible name of the name button, e.g. "Open biography: Jane Doe". */
  openLabel: string
  /** Accessible name of the × button. */
  closeLabel: string
}) {
  const [open, setOpen] = useState(false)
  const titleId = useId()

  return (
    <>
      <Name className="text-base leading-title font-medium wrap-anywhere">
        <button
          type="button"
          aria-haspopup="dialog"
          aria-label={stegaClean(openLabel)}
          onClick={() => setOpen(true)}
          className="cursor-pointer text-left wrap-anywhere text-accent transition-opacity duration-180 ease-out hover:opacity-60"
        >
          {name}
        </button>
      </Name>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        labelledBy={titleId}
        closeLabel={closeLabel}
        variant="panel"
      >
        <div className="flex flex-col gap-8 p-6 md:p-10">
          <div className="flex min-w-0 items-center gap-4 pr-10 md:gap-6">
            <Avatar name={name} image={photo} size="xl" />
            <div className="flex min-w-0 flex-col gap-2">
              <h2 id={titleId} className="text-title-lg font-medium text-balance wrap-anywhere text-foreground">
                {name}
              </h2>
              {role && <p className="text-base leading-copy text-pretty text-grey">{role}</p>}
              {organisation && <p className="text-base leading-copy text-pretty text-foreground">{organisation}</p>}
            </div>
          </div>
          <div className="max-w-160 text-foreground">{bio}</div>
        </div>
      </Dialog>
    </>
  )
}
