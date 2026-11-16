import type { EditionStatusCopyKey } from './awards-programme-copy'

/** Where an awards edition stands today, from its dates and whether it has winners. */
export type EditionStatus = 'launchingSoon' | 'submissionsOpen' | 'ceremonyDue' | 'winnersAnnounced'

/**
 * The status of an edition, from its calendar dates, its winners and the UK date the query ran with. ISO dates
 * compare as strings, as `nominationsClosingDate >= $today` does in GROQ. Shared by the awards programme page and
 * the award category page sidebar.
 * - nominations open after today → launching soon;
 * - nominations close today or later → submissions open;
 * - otherwise, a ceremony today or later → ceremony due;
 * - otherwise, a ceremony before today and at least one winner → winners announced.
 * Null for a past edition without winners.
 */
export function editionStatus(
  edition: {
    nominationsOpeningDate?: string | null
    nominationsClosingDate?: string | null
    startDate?: string | null
    hasWinners: boolean
  },
  today: string,
): EditionStatus | null {
  const { nominationsOpeningDate: opening, nominationsClosingDate: closing, startDate, hasWinners } = edition

  if (closing && closing >= today) {
    return opening && opening > today ? 'launchingSoon' : 'submissionsOpen'
  }

  if (startDate && startDate >= today) {
    return 'ceremonyDue'
  }

  return startDate && startDate < today && hasWinners ? 'winnersAnnounced' : null
}

/** The status label of each status, in the "Awards programme page" document. */
export const EDITION_STATUS_LABELS: Record<EditionStatus, EditionStatusCopyKey> = {
  launchingSoon: 'launchingSoonLabel',
  submissionsOpen: 'submissionsOpenLabel',
  ceremonyDue: 'ceremonyDueLabel',
  winnersAnnounced: 'winnersAnnouncedLabel',
}
