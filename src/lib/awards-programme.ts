import type { PortableTextProps } from 'next-sanity'

import type { BreadcrumbItem } from '@/components/ui/Breadcrumb'
import type { EmbedConsentCopy } from '@/components/ui/ConsentEmbed.client'
import type { MediaImage } from '@/components/ui/Media'

import type { OtherProgrammeView } from './award-category'
import type { AdUnits } from './gam'
import type { HeadingLevel } from './headings'

/** The in-page sections the sticky navigation links to, by their anchor ids. */
export const AWARDS_PROGRAMME_SECTIONS = ['overview', 'judging-panel', 'winners', 'categories', 'marketing-kit'] as const

export type AwardsProgrammeSectionId = (typeof AWARDS_PROGRAMME_SECTIONS)[number]

/** A section heading from the page document (toHeading); null when it has no text. */
export type HeadingView = { as: HeadingLevel; text: string } | null

type RichTextValue = PortableTextProps['value']

type LinkView = { label: string; href: string }

export type JudgeView = {
  key: string
  name: string
  jobTitle: string | null
  /** The person's first company. */
  company: string | null
  photo: MediaImage | null
  bio: RichTextValue | null
}

export type JudgesPanelView = {
  key: string
  /** Shown only when the edition has more than one panel. */
  name: string | null
  people: JudgeView[]
}

export type ProgrammeWinnerView = {
  key: string
  category: string
  /** The award category page, when the edition belongs to a programme. */
  categoryHref: string | null
  /** The winner as shown (winnerName): "Person, Company", or the company alone. */
  name: string
  /** The company as shown (display name or company title), the wordmark when there is no logo. */
  organisation: string
  logo: MediaImage | null
}

export type WinnersGroupView = {
  key: string
  /** Anchor id of the group, the target of its filter. */
  id: string
  /** The category group as shown (categoryGroupLabel); null for rows without one. */
  label: string | null
  winners: ProgrammeWinnerView[]
}

export type AwardsProgrammeView = {
  title: string
  breadcrumb: BreadcrumbItem[]
  standfirst: string | null
  /** The edition status (editionStatus); null for a past edition without winners. */
  status: { label: string; highlight: boolean } | null
  /** The date range; null when the edition hides it. */
  date: string | null
  venue: string | null
  country: string | null
  register: LinkView | null
  /** The programme's previous edition; null without a programme or an earlier edition. */
  previousYear: LinkView | null
  nav: { id: AwardsProgrammeSectionId; label: string }[]
  overview: { heading: HeadingView; body: RichTextValue | null; logo: MediaImage | null } | null
  video: {
    heading: HeadingView
    description: string | null
    /** The Vimeo player, shown in the lightbox once the reader allows functional cookies. */
    playerSrc: string
    /** The texts shown instead of the player until then. */
    consent: EmbedConsentCopy
    thumbnail: MediaImage | null
  } | null
  judges: {
    heading: HeadingView
    intro: RichTextValue | null
    panels: JudgesPanelView[]
    viewBiographyLabel: string
    hideBiographyLabel: string
  } | null
  winners: {
    heading: HeadingView
    previousYear: LinkView | null
    allLabel: string
    total: number
    groups: WinnersGroupView[]
  } | null
  categories: { heading: HeadingView; items: string[] } | null
  marketingKit: { heading: HeadingView; text: string; link: LinkView } | null
  otherProgrammes: { heading: HeadingView; items: OtherProgrammeView[] }
  ads: Pick<AdUnits, 'top' | 'side'>
}
