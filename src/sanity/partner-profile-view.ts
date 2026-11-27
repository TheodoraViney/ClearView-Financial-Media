import { stegaClean, type StegaBranded } from 'next-sanity'

import type { AdUnits } from '@/lib/gam'
import { blocksOrNull } from '@/lib/research-report'
import { resolveHref, safeHref, sharedRecordHref } from '@/lib/links'
import { type LinkView, type PartnerProfileView, type RecognitionView, winLabel, yearOf } from '@/lib/partner-profile'
import {
  COMPANY_NAME_TOKEN,
  fillTemplate,
  PARTNER_PROFILE_PAGE_COPY_KEYS,
  PROFILE_METRICS_MAX,
  SPONSOR_TITLE_TOKEN,
  type PartnerProfilePageCopy,
} from '@/lib/partner-profile-copy'

import { clipDescription, sectionHeading } from './awards-programme-view'
import { toImage } from './image'
import type { PARTNER_PROFILE_PAGE_QUERY_RESULT, PARTNER_PROFILE_QUERY_RESULT } from './types'

export type PartnerProfileData = NonNullable<StegaBranded<PARTNER_PROFILE_QUERY_RESULT>>
type CopyData = NonNullable<StegaBranded<PARTNER_PROFILE_PAGE_QUERY_RESULT>>
type LinkRowData = NonNullable<PartnerProfileData['officialLinks']>[number]

const filled = (value: string | null | undefined): value is string => Boolean(stegaClean(value)?.trim())

/** Plain text with its whitespace collapsed, stega removed. */
const plain = (value: string | null | undefined): string => stegaClean(value ?? '').replace(/\s+/g, ' ').trim()

/** The labels as the CMS holds them, stega kept for click-to-edit. Every label is required in the Studio. */
function toCopy(copy: CopyData): PartnerProfilePageCopy {
  return Object.fromEntries(PARTNER_PROFILE_PAGE_COPY_KEYS.map((key) => [key, copy[key] ?? ''])) as PartnerProfilePageCopy
}

/** The profile's own path, /companies/{slug} (relative: the page is served on ClearView only). */
export const partnerProfilePath = (company: Pick<PartnerProfileData, 'slug'>): string | null =>
  sharedRecordHref('company', company.slug, 'clearview')

/** The metadata description: the start of About cut at a word boundary, or null without one. */
export const partnerProfileDescription = (company: PartnerProfileData): string | null => clipDescription(plain(company.aboutText))

/** Link rows typed on the company: a label and a target that resolves (allowlisted address or a routable document). */
const linkRows = (rows: LinkRowData[] | null | undefined): LinkView[] =>
  (rows ?? []).flatMap((row) => {
    const href = resolveHref(row.link, 'clearview')

    return href && filled(row.label) ? [{ key: row._key, label: row.label, href }] : []
  })

/**
 * The editions the company won at, newest first (the query's order), each with one chip per winner row: the category,
 * and the people when the award went to individuals. Identical chips are shown once. Editions without a titled category
 * are left out. The title is the programme's, else the edition's own (an edition without a programme).
 */
function recognition(company: PartnerProfileData): RecognitionView[] {
  return company.recognition.flatMap((edition) => {
    const title = filled(edition.programme) ? edition.programme : edition.title
    const seen = new Set<string>()
    const wins = (edition.wins ?? []).flatMap((win) => {
      if (!filled(win.category)) {
        return []
      }

      const label = winLabel(win.category, win.people, filled)
      const id = plain(label)

      if (seen.has(id)) {
        return []
      }

      seen.add(id)

      return [{ key: win._key, label }]
    })

    if (!filled(title) || wins.length === 0) {
      return []
    }

    const year = yearOf(stegaClean(edition.startDate))

    return [{ key: edition._id, title, year, wins, winsLabel: [plain(title), year].filter(Boolean).join(' ') }]
  })
}

/** The partner profile ("Company profile") page as plain props, from the company, the labels document and the ads. */
export function toPartnerProfileView({
  company,
  copy: rawCopy,
  ads,
}: {
  company: PartnerProfileData
  copy: CopyData
  ads: AdUnits
}): PartnerProfileView {
  const copy = toCopy(rawCopy)
  const name = company.title ?? ''
  const cleanName = plain(name)
  // The website only: a site-relative or mailto value is not a company's site.
  const website = safeHref(company.websiteUrl)
  const profileImage = toImage(company.profileImage)
  const logo = toImage(company.logo)
  // Screen-reader text for a logo or the name lockup, as the design's default ("{name} logo").
  const logoAlt = `${cleanName} logo`

  const metrics = (company.profileMetrics ?? [])
    .slice(0, PROFILE_METRICS_MAX)
    .flatMap((item) => (filled(item.value) && filled(item.text) ? [{ key: item._key, value: item.value, text: item.text, note: null }] : []))
  const rows = (company.profileFields ?? []).flatMap((row) => {
    const values = (row.values ?? []).filter(filled)

    return filled(row.label) && values.length > 0 ? [{ key: row._key, label: row.label, values }] : []
  })
  const sponsor = company.sponsorships.flatMap((record) =>
    filled(record.title)
      ? [{ key: record._id, text: fillTemplate(copy.sponsorActivityText, SPONSOR_TITLE_TOKEN, record.title) }]
      : [],
  )
  const won = recognition(company)
  const interviews = linkRows(company.sponsorInterviews)
  const archiveTitles = (company.awardsArchiveTitles ?? []).filter(filled)
  const officialLinks = linkRows(company.officialLinks)
  // The section link of the breadcrumb and the awards archive link: optional targets on the labels document.
  const profileHref = resolveHref(rawCopy.breadcrumbProfileLink, 'clearview')
  const archiveHref = resolveHref(rawCopy.archiveLink, 'clearview')

  return {
    name,
    // The middle item links where the labels document says, and is grey plain text without a link.
    breadcrumb: [
      { label: copy.breadcrumbHomeLabel, href: '/' },
      profileHref ? { label: copy.breadcrumbProfileLabel, href: profileHref } : { label: copy.breadcrumbProfileLabel, muted: true },
      { label: name },
    ],
    typeLabel: copy.typeLabel,
    description: blocksOrNull(company.about),
    website:
      website && /^https?:\/\//i.test(website)
        ? { label: fillTemplate(copy.websiteLinkLabel, COMPANY_NAME_TOKEN, name), href: website }
        : null,
    panel: profileImage
      ? { kind: 'image', image: profileImage }
      : logo
        ? { kind: 'logo', image: logo.alt ? logo : { ...logo, alt: logoAlt } }
        : { kind: 'lockup', name, label: logoAlt },
    metrics: metrics.length > 0 ? { label: plain(copy.atAGlanceLabel), items: metrics } : null,
    fields: rows.length > 0 ? { heading: sectionHeading(rawCopy.fieldsHeading), rows } : null,
    activity:
      sponsor.length > 0 || won.length > 0
        ? {
            heading: sectionHeading(rawCopy.activityHeading),
            sponsor: sponsor.length > 0 ? { heading: sectionHeading(rawCopy.sponsorActivityHeading, 'h3'), items: sponsor } : null,
            recognition: won.length > 0 ? { heading: sectionHeading(rawCopy.recognitionHeading, 'h3'), items: won } : null,
          }
        : null,
    coverage:
      interviews.length > 0 || archiveTitles.length > 0
        ? {
            heading: sectionHeading(rawCopy.coverageHeading),
            interviews:
              interviews.length > 0 ? { heading: sectionHeading(rawCopy.sponsorInterviewsHeading, 'h3'), items: interviews } : null,
            archive:
              archiveTitles.length > 0
                ? {
                    heading: sectionHeading(rawCopy.archiveCoverageHeading, 'h3'),
                    titles: archiveTitles,
                    link: archiveHref && filled(copy.archiveLinkLabel) ? { label: copy.archiveLinkLabel, href: archiveHref } : null,
                  }
                : null,
          }
        : null,
    officialLinks: officialLinks.length > 0 ? { heading: sectionHeading(rawCopy.officialLinksHeading), items: officialLinks } : null,
    ads: { top: ads.top, side: ads.side },
  }
}
