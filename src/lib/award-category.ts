import type { BreadcrumbItem } from '@/components/ui/Breadcrumb'
import type { Definition } from '@/components/ui/DefinitionList'
import type { MediaImage } from '@/components/ui/Media'

import type { AwardCategoryPageCopy } from './award-category-copy'
import type { AdUnits } from './gam'

/** Where an upcoming edition stands today, from its dates. */
export type EditionStatus = 'launchingSoon' | 'submissionsOpen' | 'ceremonyDue'

/**
 * The status of an edition in the sidebar, from its calendar dates and the UK date the query ran with. ISO dates
 * compare as strings, as `nominationsClosingDate >= $today` does in GROQ.
 * - nominations open after today → launching soon;
 * - nominations close today or later → submissions open;
 * - otherwise, a ceremony today or later → ceremony due.
 * Null for a past edition (the query leaves them out).
 */
export function editionStatus(
  edition: {
    nominationsOpeningDate?: string | null
    nominationsClosingDate?: string | null
    startDate?: string | null
  },
  today: string,
): EditionStatus | null {
  const { nominationsOpeningDate: opening, nominationsClosingDate: closing, startDate } = edition

  if (closing && closing >= today) {
    return opening && opening > today ? 'launchingSoon' : 'submissionsOpen'
  }

  return startDate && startDate >= today ? 'ceremonyDue' : null
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
  status: string
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
  otherProgrammes: OtherProgrammeView[]
  copy: AwardCategoryPageCopy
  ads: Pick<AdUnits, 'top' | 'side'>
}
