import { stegaClean, type StegaBranded } from 'next-sanity'

import { toLinkProps } from '@/components/blocks/post-card'
import type { EmbedConsentCopy } from '@/components/ui/ConsentEmbed.client'
import { categoryGroupLabel, openProgrammeEditions, winnerName, type OtherProgrammeView } from '@/lib/award-category'
import type {
  AwardsProgrammeSectionId,
  AwardsProgrammeView,
  JudgesPanelView,
  SponsorTierView,
  WinnersGroupView,
} from '@/lib/awards-programme'
import {
  AWARDS_PROGRAMME_PAGE_COPY_KEYS,
  type AwardsProgrammePageCopy,
  type AwardsProgrammePageCopyKey,
  type EditionStatusCopy,
} from '@/lib/awards-programme-copy'
import { EDITION_STATUS_LABELS, editionStatus } from '@/lib/awards-status'
import { countryName } from '@/lib/countries'
import { formatLongDate, formatWeekdayDate } from '@/lib/dates'
import type { AdUnits } from '@/lib/gam'
import { acclaimHref, AWARDS_LISTING_PATH, awardCategoryHref, sharedRecordHref } from '@/lib/links'

import { toStatuses } from './award-category-view'
import { toHeading } from './heading'
import { toImage } from './image'
import type { AWARDS_PROGRAMME_PAGE_QUERY_RESULT, AWARDS_PROGRAMME_QUERY_RESULT, OPEN_AWARDS_QUERY_RESULT } from './types'

type RecordData = StegaBranded<AWARDS_PROGRAMME_QUERY_RESULT>
type CopyData = StegaBranded<AWARDS_PROGRAMME_PAGE_QUERY_RESULT>
type OpenData = StegaBranded<OPEN_AWARDS_QUERY_RESULT>
type OpenEdition = OpenData[number]

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
const richText = <T extends Body | readonly unknown[]>(value: T | null | undefined): T | null =>
  value && value.length > 0 ? value : null

type TextBlocks = readonly { _type: string; children?: readonly { text?: string | null }[] | null }[]

/** The text blocks of a Portable Text field as one line of plain text. Also used by the event page. */
export function plainText(value: TextBlocks | null | undefined): string {
  return (value ?? [])
    .flatMap((block) => (block._type === 'block' ? [(block.children ?? []).map((child) => child.text ?? '').join('')] : []))
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * A metadata description from plain text: the text, cut at a word boundary near DESCRIPTION_LENGTH. Null when empty.
 * Also used by the event page.
 */
export function clipDescription(text: string): string | null {
  if (!text) {
    return null
  }

  if (text.length <= DESCRIPTION_LENGTH) {
    return text
  }

  const end = text.lastIndexOf(' ', DESCRIPTION_LENGTH)

  return `${text.slice(0, end > DESCRIPTION_LENGTH / 2 ? end : DESCRIPTION_LENGTH).replace(/[\s,.;:]+$/, '')}…`
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

  return clipDescription(stegaClean(plainText(edition.body)))
}

function toPanels(edition: EditionData): JudgesPanelView[] {
  return (edition.judgesPanels ?? [])
    .map((panel) => ({
      key: panel._key,
      name: filled(panel.name) ? panel.name : null,
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
    .filter((panel) => panel.people.length > 0)
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
      name: winnerName(row) ?? company,
      organisation: filled(row.displayName) ? row.displayName : company,
      logo: toImage(row.company?.logo),
      banner: toImage(row.banner),
    })
    groups.set(key, group)
  }

  return [...groups.values()]
}

/** The sponsor tiers in their stored order; a company unpublished or deleted after picking is dropped, then an empty tier. */
function toSponsorTiers(edition: EditionData): SponsorTierView[] {
  return (edition.sponsorTypes ?? [])
    .map((tier) => ({
      key: tier._key,
      name: filled(tier.name) ? tier.name : null,
      sponsors: (tier.companies ?? []).flatMap((company) =>
        company?.title ? [{ key: company._id, name: company.title, logo: toImage(company.logo) }] : [],
      ),
    }))
    .filter((tier) => tier.sponsors.length > 0)
}

/** The questions with both a question and an answer, in order. */
function toFaq(edition: EditionData) {
  return (edition.faq ?? []).flatMap((item) => {
    const answer = richText(item.answer)

    return filled(item.question) && answer ? [{ key: item._key, question: item.question, answer }] : []
  })
}

/**
 * One row of "Other awards programmes": title, then "{status} | {deadline label} {date}". The status is the CMS label
 * of the edition's status, drawn in the accent as the design's submissions-open row.
 */
function toOpenProgramme(
  edition: OpenEdition,
  title: string,
  statuses: EditionStatusCopy,
  deadlineLabel: string,
  today: string,
): OtherProgrammeView {
  const status = editionStatus(
    {
      nominationsOpeningDate: stegaClean(edition.nominationsOpeningDate),
      nominationsClosingDate: stegaClean(edition.nominationsClosingDate),
      startDate: stegaClean(edition.startDate),
      hasWinners: false,
    },
    today,
  )
  const deadline = formatLongDate(stegaClean(edition.nominationsClosingDate))

  return {
    key: edition._id,
    title,
    href: sharedRecordHref('awardsProgramme', edition.slug, 'clearview'),
    status: status ? statuses[EDITION_STATUS_LABELS[status]] || null : null,
    highlight: true,
    meta: deadline ? [`${deadlineLabel} ${deadline}`] : [],
  }
}

/**
 * The awards programme page as plain props (design v1.10), from the awards edition, its page document and the open
 * programmes fill. Every section without content is null, which hides it and its navigation link.
 */
export function toAwardsProgrammeView({
  edition,
  open,
  copy: rawCopy,
  ads,
  today,
  embedConsent,
}: {
  edition: EditionData
  open: OpenData
  copy: NonNullable<CopyData>
  ads: AdUnits
  today: string
  embedConsent: EmbedConsentCopy
}): AwardsProgrammeView {
  const copy = toCopy(rawCopy)
  const statuses = toStatuses(rawCopy)
  const winnerGroups = toWinnerGroups(edition)
  const status = editionStatus(
    {
      nominationsOpeningDate: stegaClean(edition.nominationsOpeningDate),
      nominationsClosingDate: stegaClean(edition.nominationsClosingDate),
      startDate: stegaClean(edition.startDate),
      hasWinners: winnerGroups.length > 0,
    },
    today,
  )
  // Nominations are open (or about to open) while the closing date is today or later.
  const nominationsOpen = status === 'submissionsOpen' || status === 'launchingSoon'
  const statusLabel = status ? statuses[EDITION_STATUS_LABELS[status]] || null : null
  const year = stegaClean(edition.startDate)?.slice(0, 4)
  const previousHref = edition.programme ? sharedRecordHref('awardsProgramme', edition.previous?.slug, 'clearview') : null
  const videoId = stegaClean(edition.highlightsVideoId)?.trim()
  const acclaimLink = acclaimHref(edition.acclaimLink)
  const body = richText(edition.body)
  const finalists = richText(edition.finalists)
  const panels = toPanels(edition)
  const sponsorTiers = toSponsorTiers(edition)
  const faq = toFaq(edition)
  const steps = (edition.registrationSteps ?? []).flatMap((step) => {
    const text = richText(step.text)

    return text ? [{ key: step._key, text }] : []
  })
  const openItems = openProgrammeEditions(rawCopy.otherProgrammes, open, {
    today,
    excludeEdition: edition._id,
    clean: stegaClean,
  }).map(({ edition: item, title }) => toOpenProgramme(item, title, statuses, copy.deadlineLabel, today))

  const view: Omit<AwardsProgrammeView, 'nav'> = {
    title: edition.title ?? '',
    breadcrumb: [
      { label: copy.breadcrumbHomeLabel, href: '/' },
      { label: copy.breadcrumbAwardsLabel, href: AWARDS_LISTING_PATH },
      { label: edition.title ?? '' },
    ],
    standfirst: filled(edition.standfirst) ? edition.standfirst : null,
    logo: toImage(edition.logo),
    status: statusLabel,
    date: stegaClean(edition.hideDateTime) ? null : formatWeekdayDate(stegaClean(edition.startDate), stegaClean(edition.endDate)),
    venue: filled(edition.venue) ? edition.venue : null,
    country: countryName(stegaClean(edition.country)),
    register: toLinkProps({ ...edition.registerLink, label: edition.registerLink?.label || copy.registerLabel }, 'clearview'),
    sponsor: toLinkProps(rawCopy.sponsorLink, 'clearview'),
    previousYear: previousHref ? { label: copy.previousYearLabel, href: previousHref } : null,
    overview: body ? { heading: toHeading(rawCopy.overviewHeading), body } : null,
    // The schema allows digits only; checked again because the Content API accepts writes that never ran validation.
    video:
      videoId && /^\d+$/.test(videoId)
        ? {
            heading: toHeading(rawCopy.videoHeading),
            dialogTitle: copy.videoDialogTitle,
            description: filled(edition.highlightVideoDescription) ? edition.highlightVideoDescription : null,
            playerSrc: `https://player.vimeo.com/video/${videoId}`,
            consent: embedConsent,
            thumbnail: toImage(edition.highlightVideoThumbnail),
          }
        : null,
    registration:
      steps.length > 0
        ? {
            heading: toHeading(rawCopy.categoriesHeading),
            // The year is the ceremony's (start date); the label after it comes from the CMS.
            badge: nominationsOpen
              ? statusLabel
              : [year, copy.registrationClosedLabel].filter(Boolean).join(' ') || null,
            intro: nominationsOpen ? copy.registrationOpenIntro : copy.registrationClosedIntro,
            steps,
          }
        : null,
    sponsors: sponsorTiers.length > 0 ? { heading: toHeading(rawCopy.sponsorsHeading), tiers: sponsorTiers } : null,
    judges:
      panels.length > 0 ? { heading: toHeading(rawCopy.judgesHeading), intro: richText(edition.judgesIntro), panels } : null,
    finalists: finalists ? { heading: toHeading(rawCopy.finalistsHeading), body: finalists } : null,
    winners:
      winnerGroups.length > 0
        ? {
            heading: toHeading(rawCopy.winnersHeading),
            previousYear: previousHref ? { label: copy.previousYearWinnersLabel, href: `${previousHref}#winners` } : null,
            allLabel: copy.winnersAllLabel,
            groups: winnerGroups,
          }
        : null,
    acclaim: acclaimLink
      ? {
          heading: toHeading(rawCopy.marketingKitHeading),
          text: copy.marketingKitText,
          link: { label: copy.acclaimLinkLabel, href: acclaimLink },
        }
      : null,
    faq: faq.length > 0 ? { heading: toHeading(rawCopy.faqHeading), items: faq } : null,
    openProgrammes: {
      allAwards: toLinkProps(rawCopy.allAwardsLink, 'clearview'),
      heading: toHeading(rawCopy.otherProgrammesHeading),
      items: openItems,
      emptyText: copy.openProgrammesEmptyText,
    },
    ads: { top: ads.top, side: ads.side },
  }

  // One link per section that has content and a label, in page order. A section whose label is empty still renders,
  // without a link: an empty link would be a focusable stop with no name.
  const sections: [AwardsProgrammeSectionId, unknown, AwardsProgrammePageCopyKey][] = [
    ['overview', view.overview, 'navOverviewLabel'],
    ['highlight-video', view.video, 'navVideoLabel'],
    ['categories-and-registration', view.registration, 'navCategoriesLabel'],
    ['sponsors', view.sponsors, 'navSponsorsLabel'],
    ['judging-panel', view.judges, 'navJudgesLabel'],
    ['finalists', view.finalists, 'navFinalistsLabel'],
    ['winners', view.winners, 'navWinnersLabel'],
    ['acclaim', view.acclaim, 'navMarketingKitLabel'],
    ['faq', view.faq, 'navFaqLabel'],
  ]

  return {
    ...view,
    nav: sections.flatMap(([id, section, label]) => (section && filled(copy[label]) ? [{ id, label: copy[label] }] : [])),
  }
}
