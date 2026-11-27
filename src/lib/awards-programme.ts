import type { PortableTextProps } from 'next-sanity'

import type { BreadcrumbItem } from '@/components/ui/Breadcrumb'
import type { EmbedConsentCopy } from '@/components/ui/ConsentEmbed.client'
import type { MediaImage } from '@/components/ui/Media'

import type { OtherProgrammeView } from './award-category'

import type { AdUnits } from './gam'
import type { HeadingLevel } from './headings'

/** The in-page sections the sticky navigation links to, by their anchor ids, in page order (design v1.11, plus Finalists). */
export const AWARDS_PROGRAMME_SECTIONS = [
  'overview',
  'highlight-video',
  'categories-and-registration',
  'sponsors',
  'judging-panel',
  'finalists',
  'winners',
  'acclaim',
  'faq',
] as const

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
  /** The panel name above its judges; null when the panel has none. */
  name: string | null
  people: JudgeView[]
}

export type SponsorView = { key: string; name: string; logo: MediaImage | null }

/** One sponsor tier (a companyGroup of `sponsorTypes`): its name above its logos. */
export type SponsorTierView = { key: string; name: string | null; sponsors: SponsorView[] }

export type FaqItemView = { key: string; question: string; answer: RichTextValue }

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
  /** The designed winner banner; the row shows as text without one. */
  banner: MediaImage | null
}

export type WinnersGroupView = {
  key: string
  /** Anchor id of the group, which its heading labels. */
  id: string
  /** The category group as shown (categoryGroupLabel); null for rows without one. */
  label: string | null
  winners: ProgrammeWinnerView[]
}

/** One shortlist: an award category (older editions) or none, and its finalist companies in the order typed. */
export type FinalistsListView = {
  key: string
  category: string | null
  /** The award category page, when the row links a category and the edition belongs to a programme. */
  categoryHref: string | null
  companies: { key: string; name: string }[]
}

export type FinalistsGroupView = {
  key: string
  /** Anchor id of the group, which its heading labels. */
  id: string
  /** The category group as shown (categoryGroupLabel); null for rows without one. */
  label: string | null
  lists: FinalistsListView[]
}

export type AwardsProgrammeView = {
  title: string
  breadcrumb: BreadcrumbItem[]
  standfirst: string | null
  /** The edition logo, in the masthead; null without one. */
  logo: MediaImage | null
  /** The edition status (editionStatus); null for a past edition without winners. */
  status: string | null
  /** The date range; null when the edition hides it. */
  date: string | null
  venue: string | null
  country: string | null
  register: LinkView | null
  /** "Become a Sponsoring Partner": the page document's link, null when it does not resolve. */
  sponsor: LinkView | null
  /** The programme's previous edition; null without a programme or an earlier edition. */
  previousYear: LinkView | null
  nav: { id: AwardsProgrammeSectionId; label: string }[]
  overview: { heading: HeadingView; body: RichTextValue } | null
  video: {
    heading: HeadingView
    /** The title above the player in the lightbox. */
    dialogTitle: string
    description: string | null
    /** The Vimeo player, shown in the lightbox once the reader allows functional cookies. */
    playerSrc: string
    /** The texts shown instead of the player until then. */
    consent: EmbedConsentCopy
    thumbnail: MediaImage | null
  } | null
  registration: {
    heading: HeadingView
    /** "2026 nominations closed" once nominations have closed, else the open status ("Submissions open"). */
    badge: string | null
    intro: string
    steps: { key: string; text: RichTextValue }[]
  } | null
  sponsors: { heading: HeadingView; tiers: SponsorTierView[] } | null
  judges: { heading: HeadingView; intro: RichTextValue | null; panels: JudgesPanelView[] } | null
  /**
   * The intro (text, image or video above the lists) and the finalists by category group, with "All" for the group
   * buttons; `legacy` is the old rich text, shown only for an edition whose finalists were not split into rows.
   */
  finalists: {
    heading: HeadingView
    intro: RichTextValue | null
    /** Shown instead of a video in the intro until the reader allows functional cookies. */
    consent: EmbedConsentCopy
    allLabel: string
    groups: FinalistsGroupView[]
    legacy: RichTextValue | null
  } | null
  winners: {
    heading: HeadingView
    previousYear: LinkView | null
    /** "All", the first category group button. */
    allLabel: string
    groups: WinnersGroupView[]
  } | null
  acclaim: { heading: HeadingView; text: string; link: LinkView } | null
  faq: { heading: HeadingView; items: FaqItemView[] } | null
  /**
   * The right rail's "Other awards programmes" (design v1.11): every open edition, the editor's pins first; the
   * "View all awards" link above it (null when the link does not resolve) and the text shown when nothing is open.
   */
  openProgrammes: {
    allAwards: LinkView | null
    heading: HeadingView
    items: OtherProgrammeView[]
    emptyText: string
  }
  ads: Pick<AdUnits, 'top' | 'side'>
}
