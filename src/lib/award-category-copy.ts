/*
 * Visible labels of the award category page, edited in the "Award category page" document (ClearView folder in the
 * Studio). The design texts live only as the fields' initial values in the schema; the page renders the stored values.
 * Pure: no Sanity or Next imports, so the Studio validation and the page share the template rule.
 */
export const AWARD_CATEGORY_PAGE_COPY_KEYS = [
  'breadcrumbAwardsLabel',
  'detailsHeading',
  'eligibilityLabel',
  'recognisesLabel',
  'judgingLabel',
  'winnersHeading',
  'winnerLabel',
  'otherProgrammesHeading',
  'launchingSoonLabel',
  'submissionsOpenLabel',
  'ceremonyDueLabel',
] as const

export type AwardCategoryPageCopyKey = (typeof AWARD_CATEGORY_PAGE_COPY_KEYS)[number]

export type AwardCategoryPageCopy = Record<AwardCategoryPageCopyKey, string>

export const AWARD_YEAR_TOKEN = '{year}'

/** Why the winner label is invalid, or null when it is valid (an empty value is the required rule's job). */
export function winnerLabelError(value: string | null | undefined): string | null {
  if (!value) {
    return null
  }

  return value.split(AWARD_YEAR_TOKEN).length === 2 ? null : `Use ${AWARD_YEAR_TOKEN} exactly once`
}

/** "2025 winner" from the label template; a label without the placeholder is shown as it is. */
export function winnerLabel(template: string, year: string): string {
  return template.split(AWARD_YEAR_TOKEN).join(year)
}
