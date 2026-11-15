'use client'

import { useCallback, useState } from 'react'
import { createPortal } from 'react-dom'

import { ConsentEmbed, type EmbedConsentCopy } from '@/components/ui/ConsentEmbed.client'

/**
 * An archived article's body HTML with its players held until the reader allows functional cookies. ArchiveBody has
 * replaced each player iframe with an empty `data-consent-embed` slot carrying its address; a ConsentEmbed is rendered
 * into every slot once the HTML is in the page.
 */
export function ArchiveProse({ html, embedCopy }: { html: string; embedCopy: EmbedConsentCopy }) {
  const [slots, setSlots] = useState<HTMLElement[]>([])
  const findSlots = useCallback(
    (element: HTMLDivElement | null) => setSlots(element ? [...element.querySelectorAll<HTMLElement>('[data-consent-embed]')] : []),
    [],
  )

  return (
    <>
      <div ref={findSlots} className="archive-prose" dangerouslySetInnerHTML={{ __html: html }} />
      {slots.map((slot, index) => {
        const src = slot.dataset.consentEmbed ?? ''

        return createPortal(
          <ConsentEmbed
            src={src}
            title={src.includes('libsyn.com') ? 'Podcast player' : 'Video player'}
            copy={embedCopy}
            className={src.includes('libsyn.com') ? 'min-h-24 w-full rounded-sm' : 'aspect-video w-full rounded-sm'}
          />,
          slot,
          index,
        )
      })}
    </>
  )
}
