import type { PortableTextProps } from 'next-sanity'

import type { BreadcrumbItem } from '@/components/ui/Breadcrumb'
import type { KeyFinding } from '@/components/ui/KeyFindings'
import type { MediaImage } from '@/components/ui/Media'

import type { HeadingView } from './awards-programme'
import type { AdUnitView } from './gam'

/*
 * The partner profile page (/companies/{slug} on ClearView Publishing) as plain props, built by
 * src/sanity/partner-profile-view.ts. Every section is null when it has nothing to show, and the page leaves it out.
 * Pure: no Sanity or Next imports beyond types.
 */

type RichTextValue = PortableTextProps['value']

export type LinkView = { key: string; label: string; href: string }

/** The header panel beside the text: the profile image, else the logo on a bordered panel, else the name as text. */
export type PartnerHeroPanel =
  | { kind: 'image'; image: MediaImage }
  | { kind: 'logo'; image: MediaImage }
  | { kind: 'lockup'; name: string; label: string }

/** One awards edition the company won at: its programme (or own) title, the year, and one chip per category won. */
export type RecognitionView = {
  key: string
  title: string
  year: string | null
  /** "Category", or "Category — Person, Person" when the award went to individuals. */
  wins: { key: string; label: string }[]
  /** Accessible name of the chip list, stega-clean. */
  winsLabel: string
}

export type PartnerProfileView = {
  name: string
  breadcrumb: BreadcrumbItem[]
  typeLabel: string
  description: RichTextValue | null
  website: { label: string; href: string } | null
  panel: PartnerHeroPanel
  metrics: { label: string; items: KeyFinding[] } | null
  fields: { heading: HeadingView; rows: { key: string; label: string; values: string[] }[] } | null
  activity: {
    heading: HeadingView
    sponsor: { heading: HeadingView; items: { key: string; text: string }[] } | null
    recognition: { heading: HeadingView; items: RecognitionView[] } | null
  } | null
  coverage: {
    heading: HeadingView
    interviews: { heading: HeadingView; items: LinkView[] } | null
    archive: { heading: HeadingView; titles: string[] } | null
  } | null
  officialLinks: { heading: HeadingView; items: LinkView[] } | null
  ads: { top: AdUnitView | null; side: AdUnitView | null }
}

/** The year of an ISO date (`2025-03-27` → `2025`), or null. */
export const yearOf = (date: string | null | undefined): string | null => /^(\d{4})-/.exec(date ?? '')?.[1] ?? null

/**
 * A winner row's chip text: the category, then " — " and the people who won when the award went to individuals.
 * Values keep their stega; `filled` tells whether a value has text.
 */
export function winLabel(
  category: string,
  people: (string | null)[] | null | undefined,
  filled: (value: string | null | undefined) => value is string,
): string {
  const names = (people ?? []).filter(filled)

  return names.length > 0 ? `${category} — ${names.join(', ')}` : category
}
