import { stegaClean, type StegaBranded } from 'next-sanity'

import type { Definition } from '@/components/ui/DefinitionList'
import {
  categoryGroupLabel,
  editionStatus,
  type AwardCategoryView,
  type AwardYearView,
  type EditionStatus,
  type OtherProgrammeView,
} from '@/lib/award-category'
import {
  AWARD_CATEGORY_PAGE_COPY_KEYS,
  winnerLabel,
  type AwardCategoryPageCopy,
  type AwardCategoryPageCopyKey,
} from '@/lib/award-category-copy'
import { countryName } from '@/lib/countries'
import { formatDateRange } from '@/lib/dates'
import type { AdUnits } from '@/lib/gam'
import { AWARDS_LISTING_PATH, sharedRecordHref } from '@/lib/links'

import { toImage } from './image'
import type {
  AWARD_CATEGORY_PAGE_QUERY_RESULT,
  AWARD_CATEGORY_QUERY_RESULT,
  OTHER_AWARDS_QUERY_RESULT,
} from './types'

/** Editions in the "Other awards programmes" list: the next one of each other programme. */
export const OTHER_PROGRAMMES_COUNT = 2

type CategoryData = StegaBranded<AWARD_CATEGORY_QUERY_RESULT>
type OthersData = StegaBranded<OTHER_AWARDS_QUERY_RESULT>
type CopyData = StegaBranded<AWARD_CATEGORY_PAGE_QUERY_RESULT>
type Category = NonNullable<CategoryData>
type Edition = Category['editions'][number]

const filled = <T extends string>(value: T | null | undefined): value is T => Boolean(stegaClean(value)?.trim())

/** The labels as the CMS holds them, stega kept for click-to-edit. Every label is required in the Studio. */
function toCopy(copy: NonNullable<CopyData>): AwardCategoryPageCopy {
  return Object.fromEntries(AWARD_CATEGORY_PAGE_COPY_KEYS.map((key) => [key, copy[key] ?? ''])) as AwardCategoryPageCopy
}

const STATUS_LABELS: Record<EditionStatus, AwardCategoryPageCopyKey> = {
  launchingSoon: 'launchingSoonLabel',
  submissionsOpen: 'submissionsOpenLabel',
  ceremonyDue: 'ceremonyDueLabel',
}

/**
 * Whether the category page exists: the category has a winner in at least one edition of the programme. A category
 * the programme never awarded is a 404, even with copy entered for it (the Studio offers only awarded categories).
 */
export function isAwardedCategory(category: CategoryData): category is Category & {
  programme: NonNullable<Category['programme']>
} {
  return Boolean(category?.programme && category.editions.length > 0)
}

/** The winners grouped by award year (the edition's start date), newest first. */
function toYears(editions: Edition[], template: string): AwardYearView[] {
  const years = new Map<string, NonNullable<Edition['winners']>>()

  for (const edition of editions) {
    const year = stegaClean(edition.startDate)?.slice(0, 4)

    if (year && /^\d{4}$/.test(year)) {
      // Row keys are unique within one edition only, and a year can hold two editions: prefix the edition id.
      const rows = (edition.winners ?? []).map((row) => ({ ...row, _key: `${edition._id}-${row._key}` }))

      years.set(year, [...(years.get(year) ?? []), ...rows])
    }
  }

  return [...years].map(([year, rows]) => {
    const winners = rows.filter((row) => row.company?.title)
    // One year can split a category across groups (e.g. Greater China and South-East Asia): the group then tells
    // the winners apart. Compared case-insensitively, as the migrated groups mix capitals.
    const groups = new Set(winners.map((row) => stegaClean(row.categoryGroup)?.trim().toLowerCase() ?? ''))

    return {
      year,
      label: winnerLabel(template, year),
      winners: winners.map((row) => ({
        key: row._key,
        name: row.company?.title ?? '',
        href: sharedRecordHref('company', row.company?.slug, 'clearview'),
        logo: toImage(row.company?.logo),
        note: groups.size > 1 && filled(row.categoryGroup) ? categoryGroupLabel(row.categoryGroup) : null,
      })),
    }
  })
}

function toDetails(category: Category, copy: AwardCategoryPageCopy): Definition[] {
  const rows: [field: 'eligibility' | 'recognises' | 'judging', label: AwardCategoryPageCopyKey][] = [
    ['eligibility', 'eligibilityLabel'],
    ['recognises', 'recognisesLabel'],
    ['judging', 'judgingLabel'],
  ]

  return rows.flatMap(([field, label]) => {
    const value = category[field]

    return filled(value) ? [{ key: field, label: copy[label], value }] : []
  })
}

function toOtherProgrammes(
  editions: OthersData,
  copy: AwardCategoryPageCopy,
  today: string,
): OtherProgrammeView[] {
  const seen = new Set<string>()
  const items: OtherProgrammeView[] = []

  for (const edition of editions) {
    // One edition per programme: the tiers arrive in order, so the first one seen is the programme's next.
    const programme = stegaClean(edition.programmeId) ?? edition._id
    const status = editionStatus(
      {
        nominationsOpeningDate: stegaClean(edition.nominationsOpeningDate),
        nominationsClosingDate: stegaClean(edition.nominationsClosingDate),
        startDate: stegaClean(edition.startDate),
      },
      today,
    )

    if (!status || !edition.title || seen.has(programme) || items.length >= OTHER_PROGRAMMES_COUNT) {
      continue
    }

    seen.add(programme)

    const place = countryName(stegaClean(edition.country))
    const dates = formatDateRange(stegaClean(edition.startDate), stegaClean(edition.endDate))

    items.push({
      key: edition._id,
      title: edition.title,
      href: sharedRecordHref('awardsProgramme', edition.slug, 'clearview'),
      status: copy[STATUS_LABELS[status]],
      highlight: status === 'submissionsOpen',
      meta: [place, dates].filter((part): part is string => Boolean(part)),
    })
  }

  return items
}

/** The award category page as plain props. `category` must have passed `isAwardedCategory`. */
export function toAwardCategoryView({
  category,
  others,
  copy: rawCopy,
  ads,
  today,
}: {
  category: Category & { programme: NonNullable<Category['programme']> }
  others: OthersData
  copy: NonNullable<CopyData>
  ads: AdUnits
  today: string
}): AwardCategoryView {
  const copy = toCopy(rawCopy)
  const title = category.title ?? ''
  const latest = category.editions[0]
  // The latest edition's group(s), once each whatever the capitals; the category's indicative group otherwise.
  const groupKeys = new Set<string>()
  const editionGroups = (latest?.winners ?? []).map((row) => row.categoryGroup).filter(filled).filter((group) => {
    const key = stegaClean(group).trim().toLowerCase()
    const isNew = !groupKeys.has(key)

    groupKeys.add(key)

    return isNew
  })
  const groups = (editionGroups.length > 0 ? editionGroups : [category.categoryGroup].filter(filled)).map(categoryGroupLabel)

  return {
    title,
    breadcrumb: [{ label: copy.breadcrumbAwardsLabel, href: AWARDS_LISTING_PATH }, { label: title }],
    edition: latest?.title ? { title: latest.title, href: sharedRecordHref('awardsProgramme', latest.slug, 'clearview') } : null,
    groups,
    description: filled(category.description) ? category.description : null,
    details: toDetails(category, copy),
    years: toYears(category.editions, copy.winnerLabel),
    otherProgrammes: toOtherProgrammes(others, copy, today),
    copy,
    ads: { top: ads.top, side: ads.side },
  }
}
