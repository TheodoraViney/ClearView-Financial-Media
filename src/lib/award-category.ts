import { stegaClean } from 'next-sanity'

import type { BreadcrumbItem } from '@/components/ui/Breadcrumb'
import type { Definition } from '@/components/ui/DefinitionList'
import type { MediaImage } from '@/components/ui/Media'

import type { AwardCategoryPageCopy } from './award-category-copy'
import { editionStatus } from './awards-status'
import type { AdUnits } from './gam'
import type { HeadingLevel } from './headings'

/** Editions in the "Other awards programmes" list: the editor's picks, then the next edition of other programmes. */
export const OTHER_PROGRAMMES_COUNT = 2

/** The edition fields the sidebar selection reads (OTHER_AWARDS_EDITION in queries.ts). */
export type SidebarEditionFields = {
  _id: string
  title: string | null
  programmeId: string | null
  nominationsOpeningDate: string | null
  nominationsClosingDate: string | null
  startDate: string | null
}

export type SidebarPickFields<E> = { title: string | null; edition: E | null }

/**
 * The "Other awards programmes" list, up to OTHER_PROGRAMMES_COUNT editions, shared by the site and the Studio panel:
 * - the editor's picks first, in their order. A pick of `excludeProgramme` (the page's own programme; null in the
 *   Studio, which has no page), a repeated edition, or one whose edition is unpublished is skipped. A past pick still
 *   shows. The title override wins over the edition's title;
 * - then `others` (OTHER_AWARDS_QUERY, in order): the next upcoming edition of each programme, skipping the picked
 *   editions and the programmes a pick already shows.
 * `clean` strips stega from a string before it is compared (identity outside draft mode).
 */
export function otherProgrammeEditions<E extends SidebarEditionFields>(
  picks: SidebarPickFields<E>[] | null | undefined,
  others: E[],
  {
    today,
    excludeProgramme,
    clean = (value) => value,
  }: { today: string; excludeProgramme: string | null; clean?: (value: string) => string },
): { edition: E; title: string; picked: boolean }[] {
  const cleaned = (value: string | null) => (value === null ? null : clean(value))
  const filled = (value: string | null): value is string => Boolean(cleaned(value)?.trim())
  const editions = new Set<string>()
  const programmes = new Set<string>()
  const items: { edition: E; title: string; picked: boolean }[] = []
  const add = (edition: E, title: string, programme: string, picked: boolean) => {
    editions.add(edition._id)
    programmes.add(programme)
    items.push({ edition, title, picked })
  }

  for (const pick of picks ?? []) {
    const edition = pick.edition
    const title = filled(pick.title) ? pick.title : edition?.title

    if (!edition || !title || items.length >= OTHER_PROGRAMMES_COUNT) {
      continue
    }

    const programme = cleaned(edition.programmeId) ?? edition._id

    if (programme === excludeProgramme || editions.has(edition._id)) {
      continue
    }

    add(edition, title, programme, true)
  }

  for (const edition of others) {
    // One edition per programme: the tiers arrive in order, so the first one seen is the programme's next.
    const programme = cleaned(edition.programmeId) ?? edition._id
    const upcoming = editionStatus(
      {
        nominationsOpeningDate: cleaned(edition.nominationsOpeningDate),
        nominationsClosingDate: cleaned(edition.nominationsClosingDate),
        startDate: cleaned(edition.startDate),
        // Only whether the edition is still ahead matters here: a past one is never filled in.
        hasWinners: false,
      },
      today,
    )

    if (
      !upcoming ||
      !edition.title ||
      editions.has(edition._id) ||
      programmes.has(programme) ||
      items.length >= OTHER_PROGRAMMES_COUNT
    ) {
      continue
    }

    add(edition, edition.title, programme, false)
  }

  return items
}

const filled = (value: string | null | undefined): value is string => Boolean(stegaClean(value)?.trim())

/**
 * A winner row's name as shown everywhere a winner appears: the people joined with ", ", then the company, as in
 * "Wei Tu (China), Joanna Jiang (Lulu), Stephenson Harwood". The row's display name ("Name shown on site", the name a
 * merged firm won under) replaces the company title; the logo and profile link stay the company's.
 * Values keep their stega for click-to-edit. Null when neither a display name nor a company title is there.
 */
export function winnerName(row: {
  people?: (string | null)[] | null
  displayName?: string | null
  company?: { title?: string | null } | null
}): string | null {
  const organisation = filled(row.displayName) ? row.displayName : row.company?.title

  if (!filled(organisation)) {
    return null
  }

  return [...(row.people ?? []).filter(filled), organisation].join(', ')
}

/** Abbreviations and brand spellings kept as written when an all-capitals group is recased. */
const GROUP_WORDS: Record<string, string> = {
  EAM: 'EAM',
  MENA: 'MENA',
  PR: 'PR',
  UK: 'UK',
  US: 'US',
  WEALTHTECH: 'WealthTech',
  REGTECH: 'RegTech',
}

/**
 * A winner row's category group as shown. 176 of the 221 migrated groups are in capitals ("PRIVATE BANKING
 * CATEGORIES (OVERALL)"), the rest in title case ("Private Banking Categories (Overall)"), as the design shows them.
 * An all-capitals group is recased to title case, word by word, so stega's zero-width characters stay in place.
 */
export function categoryGroupLabel(group: string): string {
  if (group !== group.toUpperCase()) {
    return group
  }

  return group.replace(/[A-Z]+/g, (word) => GROUP_WORDS[word] ?? word[0] + word.slice(1).toLowerCase())
}

export type AwardWinnerView = {
  key: string
  name: string
  /** The winner's company page (final URL, 404 until company pages exist). */
  href: string | null
  logo: MediaImage | null
  /** The category group, shown when one year's winners sit in different groups. */
  note: string | null
}

export type AwardYearView = { year: string; label: string; winners: AwardWinnerView[] }

export type OtherProgrammeView = {
  key: string
  title: string
  href: string | null
  /** Null for a picked edition that is already past: it shows without a status. */
  status: string | null
  /** The status is drawn in the brand accent (submissions open). */
  highlight: boolean
  meta: string[]
}

export type AwardCategoryView = {
  title: string
  breadcrumb: BreadcrumbItem[]
  /** The latest edition with a winner in the category, linking to its page. */
  edition: { title: string; href: string | null } | null
  /** The category group(s) of that edition's winner rows. */
  groups: string[]
  description: string | null
  details: Definition[]
  years: AwardYearView[]
  otherProgrammes: { heading: { as: HeadingLevel; text: string } | null; items: OtherProgrammeView[] }
  copy: AwardCategoryPageCopy
  ads: Pick<AdUnits, 'top' | 'side'>
}
