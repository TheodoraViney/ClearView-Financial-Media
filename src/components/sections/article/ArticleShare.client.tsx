'use client'

import { createContext, useContext, useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'

import { ActionButton } from '@/components/ui/ActionButton.client'
import { Icon } from '@/components/ui/Icon'
import type { ArticleShareLinkView } from '@/lib/article'

const COPIED_MS = 2000

type ShareState = { url: string; title: string; copied: boolean; copy: () => Promise<void> }

const ShareContext = createContext<ShareState | null>(null)

function useShare(): ShareState {
  const state = useContext(ShareContext)

  if (!state) {
    throw new Error('ShareActions and ShareRail must render inside ShareProvider')
  }

  return state
}

/**
 * The article's copy state, shared by the byline buttons and the share rail, with the page's one live region for the
 * result. Success is reported for two seconds, and only once the clipboard accepted the text: without a clipboard
 * (insecure origin, old browser) or on a refusal nothing claims it was copied.
 */
export function ShareProvider({
  url,
  title,
  linkCopiedLabel,
  children,
}: {
  url: string
  title: string
  linkCopiedLabel: string
  children: ReactNode
}) {
  const [copied, setCopied] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)

  useEffect(() => () => clearTimeout(timer.current), [])

  const copy = async () => {
    if (!navigator.clipboard) {
      return
    }

    try {
      await navigator.clipboard.writeText(url)
    } catch {
      return
    }

    setCopied(true)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setCopied(false), COPIED_MS)
  }

  return (
    <ShareContext.Provider value={{ url, title, copied, copy }}>
      {children}
      <span role="status" className="sr-only">
        {copied ? linkCopiedLabel : ''}
      </span>
    </ShareContext.Provider>
  )
}

/** Share (the device's share sheet, else copy) and Copy link, beside the byline. Labels come from the CMS. */
export function ShareActions({
  shareLabel,
  copyLinkLabel,
  linkCopiedLabel,
}: {
  shareLabel: string
  copyLinkLabel: string
  linkCopiedLabel: string
}) {
  const { url, title, copied, copy } = useShare()

  const share = () => {
    if (typeof navigator.share === 'function') {
      navigator.share({ title, url }).catch(() => {})
    } else {
      void copy()
    }
  }

  // The visible label is the accessible name (WCAG 2.5.3), so the buttons carry no aria-label.
  return (
    <div className="flex shrink-0 items-center gap-2">
      <ActionButton variant="subtle" size="compact" onClick={share}>
        <Icon name="share" />
        {shareLabel}
      </ActionButton>
      <ActionButton variant="subtle" size="compact" onClick={() => void copy()}>
        <Icon name="link" />
        <span className="whitespace-nowrap">{copied ? linkCopiedLabel : copyLinkLabel}</span>
      </ActionButton>
    </div>
  )
}

const RAIL_ITEM =
  'flex size-11 items-center justify-center rounded-sm text-grey transition-colors duration-180 ease-out hover:bg-surface-hover'

/**
 * The vertical share rail left of the text column: the brand's networks from the CMS in their order, then copy link.
 * Icon-only: each network's CMS label is its accessible name, copy link's name stays in code. The uploaded icon is
 * only a shape (mask-icon), filled with the rail's text colour like the code icons.
 */
export function ShareRail({
  label,
  links,
  className,
}: {
  label: string
  links: ArticleShareLinkView[]
  className?: string
}) {
  const { copy } = useShare()

  return (
    <aside aria-label="Share" className={className}>
      <span className="pb-2 text-caption leading-none text-grey">{label}</span>
      {links.map((link) => (
        <a
          key={link.key}
          href={link.href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={link.label}
          className={RAIL_ITEM}
        >
          <span
            aria-hidden="true"
            className="block size-5 shrink-0 mask-icon"
            style={{ '--icon': `url("${link.iconSrc}")` } as CSSProperties}
          />
        </a>
      ))}
      <button
        type="button"
        onClick={() => void copy()}
        aria-label="Copy article link"
        className={`${RAIL_ITEM} cursor-pointer`}
      >
        <Icon name="link" className="size-5" />
      </button>
    </aside>
  )
}
