import { stegaClean, type StegaBranded } from 'next-sanity'

import type { EmbedConsentCopy } from '@/components/ui/ConsentEmbed.client'
import { categoryGroupLabel } from '@/lib/award-category'
import type {
  AwardsProgrammeSectionId,
  AwardsProgrammeView,
  JudgesPanelView,
  WinnersGroupView,
} from '@/lib/awards-programme'
import {
  AWARDS_PROGRAMME_PAGE_COPY_KEYS,
  type AwardsProgrammePageCopy,
  type AwardsProgrammePageCopyKey,
} from '@/lib/awards-programme-copy'
import { EDITION_STATUS_LABELS, editionStatus } from '@/lib/awards-status'
import { countryName } from '@/lib/countries'
import { formatWeekdayDate } from '@/lib/dates'
import type { AdUnits } from '@/lib/gam'
import { acclaimHref, AWARDS_LISTING_PATH, awardCategoryHref, safeHref, sharedRecordHref } from '@/lib/links'

import { toOtherProgrammes, toStatuses } from './award-category-view'
import { toHeading } from './heading'
import { toImage } from './image'
import type { AWARDS_PROGRAMME_PAGE_QUERY_RESULT, AWARDS_PROGRAMME_QUERY_RESULT, OTHER_AWARDS_QUERY_RESULT } from './types'

type RecordData = StegaBranded<AWARDS_PROGRAMME_QUERY_RESULT>
type CopyData = StegaBranded<AWARDS_PROGRAMME_PAGE_QUERY_RESULT>
type OthersData = StegaBranded<OTHER_AWARDS_QUERY_RESULT>

/** The awards edition branch of the /events/{slug} record (AWARDS_PROGRAMME_QUERY). */
export type EditionData = Extract<NonNullable<RecordData>, { _type: 'awardsProgramme' }>

type Body = EditionData['body']

// About two lines of a search result: the metadata description when the edition has no standfirst.
const DESCRIPTION_LENGTH = 160

const filled = <T extends string>(value: T | null | undefined): value is T => Boolean(stegaClean(value)?.trim())

/** The labels as the CMS holds them, stega kept for click-to-edit. Every label is required in the Studio. */
function toCopy(copy: NonNullable<CopyData>): AwardsProgrammePageCopy {
  return Object.fromEntries(AWARDS_PROGRAMME_PAGE_COPY_KEYS.map((key) => [key, copy[key] ?? ''])) as AwardsProgrammePageCopy
}

/** A Portable Text field with at least one member, else null. */
const richText = (value: Body | null | undefined) => (value && value.length > 0 ? value : null)

/** The text blocks of a Portable Text field as one line of plain text. */
function plainText(value: Body | null | undefined): string {
  return (value ?? [])
    .flatMap((block) => (block._type === 'block' ? [(block.children ?? []).map((child) => child.text ?? '').join('')] : []))
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * The metadata description: the standfirst, else the start of the introduction cut at a word boundary. Null when the
 * edition has neither.
 */
export function editionDescription(edition: EditionData): string | null {
  const standfirst = stegaClean(edition.standfirst)?.trim()

  if (standfirst) {
    return standfirst
  }

  const text = stegaClean(plainText(edition.body))

  if (!text) {
    return null
  }

  if (text.length <= DESCRIPTION_LENGTH) {
    return text
  }

  const end = text.lastIndexOf(' ', DESCRIPTION_LENGTH)

  return `${text.slice(0, end > DESCRIPTION_LENGTH / 2 ? end : DESCRIPTION_LENGTH).replace(/[\s,.;:]+$/, '')}…`
}

function toPanels(edition: EditionData): JudgesPanelView[] {
  const panels = (edition.judgesPanels ?? []).map((panel) => ({
    key: panel._key,
    name: panel.name,
    // A person unpublished or deleted after picking dereferences to null.
    people: (panel.people ?? []).flatMap((person) =>
      person?.title
        ? [
            {
              key: person._id,
              name: person.title,
              jobTitle: filled(person.jobTitle) ? person.jobTitle : null,
              company: filled(person.company) ? person.company : null,
              photo: toImage(person.photo),
              bio: richText(person.bio),
            },
          ]
        : [],
    ),
  }))
  const shown = panels.filter((panel) => panel.people.length > 0)

  // One panel needs no name above it: the section heading already says what it is.
  return shown.map((panel) => ({ ...panel, name: shown.length > 1 && filled(panel.name) ? panel.name : null }))
}

/**
 * The winners grouped by their category group, in the order the rows are stored. Groups compare case-insensitively,
 * as the migrated groups mix capitals; the first row's spelling names the group.
 */
function toWinnerGroups(edition: EditionData): WinnersGroupView[] {
  const programmeSlug = edition.programme?.slug
  const groups = new Map<string, WinnersGroupView>()

  for (const row of edition.winners ?? []) {
    const company = row.company?.title
    const category = row.category?.title

    if (!company || !category) {
      continue
    }

    const key = stegaClean(row.categoryGroup)?.trim().toLowerCase() ?? ''
    const group = groups.get(key) ?? {
      key: key || 'ungrouped',
      id: `winners-group-${groups.size + 1}`,
      label: filled(row.categoryGroup) ? categoryGroupLabel(row.categoryGroup) : null,
      winners: [],
    }

    group.winners.push({
      key: row._key,
      category,
      categoryHref: programmeSlug ? awardCategoryHref(programmeSlug, row.category?.slug, 'clearview') : null,
      company,
      logo: toImage(row.company?.logo),
    })
    groups.set(key, group)
  }

  return [...groups.values()]
}

/** The awards programme page as plain props, from the awards edition, its page document and the sidebar fill. */
export function toAwardsProgrammeView({
  edition,
  others,
  copy: rawCopy,
  ads,
  today,
  embedConsent,
}: {
  edition: EditionData
  others: OthersData
  copy: NonNullable<CopyData>
  ads: AdUnits
  today: string
  embedConsent: EmbedConsentCopy
}): AwardsProgrammeView {
  const copy = toCopy(rawCopy)
  const statuses = toStatuses(rawCopy)
  const winnerGroups = toWinnerGroups(edition)
  const winnersTotal = winnerGroups.reduce((total, group) => total + group.winners.length, 0)
  const status = editionStatus(
    {
      nominationsOpeningDate: stegaClean(edition.nominationsOpeningDate),
      nominationsClosingDate: stegaClean(edition.nominationsClosingDate),
      startDate: stegaClean(edition.startDate),
      hasWinners: winnersTotal > 0,
    },
    today,
  )
  const previousHref = edition.programme ? sharedRecordHref('awardsProgramme', edition.previous?.slug, 'clearview') : null
  const registerHref = safeHref(edition.registerButtonLink)
  const videoId = stegaClean(edition.highlightsVideoId)?.trim()
  const marketingKitHref = acclaimHref(edition.acclaimSlug, 'clearview')
  const body = richText(edition.body)
  const logo = toImage(edition.logo)
  const panels = toPanels(edition)
  const categories = (edition.entryCategories ?? []).filter(filled)

  const view: Omit<AwardsProgrammeView, 'nav'> = {
    title: edition.title ?? '',
    breadcrumb: [
      { label: copy.breadcrumbHomeLabel, href: '/' },
      { label: copy.breadcrumbAwardsLabel, href: AWARDS_LISTING_PATH },
      { label: edition.title ?? '' },
    ],
    standfirst: filled(edition.standfirst) ? edition.standfirst : null,
    status: status ? { label: statuses[EDITION_STATUS_LABELS[status]], highlight: status === 'submissionsOpen' } : null,
    date: stegaClean(edition.hideDateTime) ? null : formatWeekdayDate(stegaClean(edition.startDate), stegaClean(edition.endDate)),
    venue: filled(edition.venue) ? edition.venue : null,
    country: countryName(stegaClean(edition.country)),
    register: registerHref ? { label: copy.registerLabel, href: registerHref } : null,
    previousYear: previousHref ? { label: copy.previousYearLabel, href: previousHref } : null,
    overview: body || logo ? { heading: toHeading(rawCopy.overviewHeading), body, logo } : null,
    // The schema allows digits only; checked again because the Content API accepts writes that never ran validation.
    video:
      videoId && /^\d+$/.test(videoId)
        ? {
            heading: toHeading(rawCopy.videoHeading),
            description: filled(edition.highlightVideoDescription) ? edition.highlightVideoDescription : null,
            playerSrc: `https://player.vimeo.com/video/${videoId}`,
            consent: embedConsent,
            thumbnail: toImage(edition.highlightVideoThumbnail),
          }
        : null,
    judges:
      panels.length > 0
        ? {
            heading: toHeading(rawCopy.judgesHeading),
            intro: richText(edition.judgesIntro),
            panels,
            viewBiographyLabel: copy.viewBiographyLabel,
            hideBiographyLabel: copy.hideBiographyLabel,
          }
        : null,
    winners:
      winnersTotal > 0
        ? {
            heading: toHeading(rawCopy.winnersHeading),
            previousYear: previousHref ? { label: copy.previousYearWinnersLabel, href: `${previousHref}#winners` } : null,
            allLabel: copy.allCategoriesLabel,
            total: winnersTotal,
            groups: winnerGroups,
          }
        : null,
    categories: categories.length > 0 ? { heading: toHeading(rawCopy.categoriesHeading), items: categories } : null,
    marketingKit: marketingKitHref
      ? {
          heading: toHeading(rawCopy.marketingKitHeading),
          text: copy.marketingKitText,
          link: { label: copy.acclaimLinkLabel, href: marketingKitHref },
        }
      : null,
    otherProgrammes: {
      heading: toHeading(rawCopy.otherProgrammesHeading),
      // An edition without a programme stands for itself, as otherProgrammeEditions keys it by its own id.
      items: toOtherProgrammes(rawCopy.otherProgrammes, others, edition.programme?._id ?? edition._id, statuses, today),
    },
    ads: { top: ads.top, side: ads.side },
  }

  // One link per section that has content, in page order.
  const sections: [AwardsProgrammeSectionId, unknown, AwardsProgrammePageCopyKey][] = [
    ['overview', view.overview, 'navOverviewLabel'],
    ['judging-panel', view.judges, 'navJudgesLabel'],
    ['winners', view.winners, 'navWinnersLabel'],
    ['categories', view.categories, 'navCategoriesLabel'],
    ['marketing-kit', view.marketingKit, 'navMarketingKitLabel'],
  ]

  return { ...view, nav: sections.flatMap(([id, section, label]) => (section ? [{ id, label: copy[label] }] : [])) }
}
