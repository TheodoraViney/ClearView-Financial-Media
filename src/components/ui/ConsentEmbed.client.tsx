'use client'

import { openCookieSettings, useConsent } from '@/lib/consent'

import { ActionButton } from './ActionButton.client'
import { cx } from './cx'

/** The texts shown instead of a third-party player until the reader allows it, from the brand's Article page. */
export type EmbedConsentCopy = { text: string; button: string }

/**
 * A third-party player (Vimeo, YouTube, Issuu, libsyn) that loads only once the reader allows functional cookies, and
 * goes again when they withdraw. Until then a box of the same size explains why and opens the cookie settings. The
 * server always renders the box, since consent is only known in the browser.
 */
export function ConsentEmbed({
  src,
  title,
  copy,
  className,
}: {
  src: string
  title: string
  copy: EmbedConsentCopy
  /** Size and shape, shared by the player and the box. */
  className?: string
}) {
  const allowed = useConsent('functional')

  if (allowed) {
    return (
      <iframe
        src={src}
        title={title}
        loading="lazy"
        allow="fullscreen; picture-in-picture"
        allowFullScreen
        className={cx('border-0', className)}
      />
    )
  }

  return (
    <div
      className={cx(
        'flex flex-col items-center justify-center gap-3 border border-border bg-surface-subtle p-4 text-center',
        className,
      )}
    >
      <p className="max-w-100 text-sm leading-normal text-pretty text-grey">{copy.text}</p>
      <ActionButton variant="outline-accent" onClick={openCookieSettings}>
        {copy.button}
      </ActionButton>
    </div>
  )
}
