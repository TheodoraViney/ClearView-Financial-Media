import Image from 'next/image'
import { type ReactNode } from 'react'

import { NEW_TAB_TEXT } from './Button'
import { Icon } from './Icon'
import { isSvg, type MediaImage } from './Media'

// Logos are 48px high; the width follows the logo, at most the column.
const LOGO_HEIGHT = 48

/**
 * research-partner-card: a bordered card, 32px inside. From the header breakpoint 12 columns 32 apart: the heading on
 * 4, the description and the accent "Company profile" link (ArrowLink `fade` look, new tab: the company's own site) on 5, the logo on 3 at the right; stacked 24 apart
 * below it, the logo on the left. `heading` is the caller's heading element (the section heading). The logo's alt is
 * the company name; without a logo the name stands in its place.
 */
export function ResearchPartnerCard({
  heading,
  name,
  description,
  link,
  logo,
}: {
  heading: ReactNode
  name: string
  description: string | null
  link: { label: string; href: string } | null
  logo: MediaImage | null
}) {
  return (
    <div className="grid min-w-0 items-start gap-6 rounded-sm border border-border bg-white p-8 header:grid-cols-12 header:gap-8">
      <div className="min-w-0 header:col-span-4">{heading}</div>
      {(description || link) && (
        <div className="flex min-w-0 flex-col items-start gap-4 py-1 header:col-span-5">
          {description && <p className="text-base leading-copy text-pretty text-foreground">{description}</p>}
          {link && (
            <a
              href={link.href}
              target="_blank"
              rel="noopener"
              className="group inline-flex min-h-11 -my-3.75 items-center gap-2 text-sm leading-none whitespace-nowrap text-accent transition-opacity duration-180 ease-out hover:opacity-60"
            >
              {link.label}
              <span className="sr-only">{NEW_TAB_TEXT}</span>
              <Icon name="chevron-right" />
            </a>
          )}
        </div>
      )}
      <div className="flex min-w-0 items-center self-stretch header:col-span-3 header:col-start-10 header:justify-end">
        {logo ? (
          <Image
            src={logo.src}
            alt={logo.alt || name}
            width={Math.round((LOGO_HEIGHT * logo.width) / logo.height)}
            height={LOGO_HEIGHT}
            unoptimized={isSvg(logo.src)}
            // 48px high, as wide as the logo's ratio allows, at most the column (about 200px on desktop).
            sizes={`${Math.min(Math.ceil((LOGO_HEIGHT * logo.width) / logo.height), 640)}px`}
            className="block h-12 w-auto max-w-full object-contain"
          />
        ) : (
          <p className="text-title-lg font-medium text-foreground">{name}</p>
        )}
      </div>
    </div>
  )
}
