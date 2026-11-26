/*
 * Visible labels of the awards programme page, edited in the "Awards page texts" document (Awards folder in the
 * Studio). The design texts live only as the fields' initial values in the schema; the page renders the stored values.
 * The edition status labels are here too: the award category page sidebar reads them from the same document.
 * Pure: no Sanity or Next imports.
 */

/** The edition status labels, shared by the awards programme page and the award category page sidebar. */
export const EDITION_STATUS_COPY_KEYS = [
  'launchingSoonLabel',
  'submissionsOpenLabel',
  'ceremonyDueLabel',
  'winnersAnnouncedLabel',
] as const

export type EditionStatusCopyKey = (typeof EDITION_STATUS_COPY_KEYS)[number]

export type EditionStatusCopy = Record<EditionStatusCopyKey, string>

export const AWARDS_PROGRAMME_PAGE_COPY_KEYS = [
  'breadcrumbHomeLabel',
  'breadcrumbAwardsLabel',
  'registerLabel',
  'previousYearLabel',
  'previousYearWinnersLabel',
  'marketingKitText',
  'acclaimLinkLabel',
  'videoConsentText',
  'videoConsentButton',
  'videoDialogTitle',
  'registrationOpenIntro',
  'registrationClosedLabel',
  'registrationClosedIntro',
  'openProgrammesEmptyText',
  'deadlineLabel',
  'navOverviewLabel',
  'navVideoLabel',
  'navCategoriesLabel',
  'navSponsorsLabel',
  'navJudgesLabel',
  'navFinalistsLabel',
  'navWinnersLabel',
  'winnersAllLabel',
  'navMarketingKitLabel',
  'navFaqLabel',
  ...EDITION_STATUS_COPY_KEYS,
] as const

export type AwardsProgrammePageCopyKey = (typeof AWARDS_PROGRAMME_PAGE_COPY_KEYS)[number]

export type AwardsProgrammePageCopy = Record<AwardsProgrammePageCopyKey, string>
