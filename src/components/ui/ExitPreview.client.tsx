'use client'

import { useIsPresentationTool } from 'next-sanity/hooks'

import { buttonClasses } from './Button'

/*
 * "Exit preview", fixed bottom right, for an editor who sees drafts on the site outside the Studio (the draft-mode
 * cookie outlives the Presentation tab). Hidden inside Presentation, which manages draft mode itself, and until the
 * hook knows (null). A plain anchor, not next/link: prefetching the route would leave draft mode on its own.
 * Editor-only tooling, so the text stays in code rather than in the CMS.
 */
export function ExitPreview() {
  const isPresentationTool = useIsPresentationTool()

  if (isPresentationTool !== false) {
    return null
  }

  return (
    <a
      href="/api/draft-mode/disable"
      className={buttonClasses({ variant: 'primary', size: 'md', className: 'fixed right-4 bottom-4 z-[2147483000] shadow-lg' })}
    >
      Exit preview
    </a>
  )
}
