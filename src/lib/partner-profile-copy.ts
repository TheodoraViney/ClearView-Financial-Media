/*
 * Visible labels of the company profile page (/companies/{slug} on ClearView Publishing), edited in the "Company profile
 * page" document (ClearView folder in the Studio). The design texts live only as the fields' initial values in the
 * schema; the page renders the stored values. Section headings are heading fields (headingField) and are read
 * separately. Screen-reader-only text stays in code. Pure: no Sanity or Next imports.
 */

export const PARTNER_PROFILE_PAGE_COPY_KEYS = [
  'breadcrumbHomeLabel',
  'breadcrumbProfileLabel',
  'typeLabel',
  'websiteLinkLabel',
  'atAGlanceLabel',
  'sponsorActivityText',
  'archiveLinkLabel',
] as const

export type PartnerProfilePageCopyKey = (typeof PARTNER_PROFILE_PAGE_COPY_KEYS)[number]

export type PartnerProfilePageCopy = Record<PartnerProfilePageCopyKey, string>

/** Where the sponsored record's title goes in `sponsorActivityText`. */
export const SPONSOR_TITLE_TOKEN = '{title}'

/** Where the company name goes in `websiteLinkLabel`. */
export const COMPANY_NAME_TOKEN = '{name}'

/** Whether a template holds its token exactly once (Studio validation of the two template labels). */
export const hasTokenOnce = (value: string, token: string): boolean => value.split(token).length === 2

/** A template label with its one token replaced; the parts around it keep their stega for click-to-edit. */
export const fillTemplate = (template: string, token: string, value: string): string => template.split(token).join(value)

/** At a glance figures: one row of five on desktop (key-findings-group `profile-metrics`, 5 / 3 / 1 columns). */
export const PROFILE_METRICS_MAX = 5
