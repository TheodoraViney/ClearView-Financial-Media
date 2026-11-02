import { stegaClean } from 'next-sanity'

import { showsListMeta, type BrandKey } from '@/brands'
import {
  Highlights as HighlightsSection,
  type HighlightsItem,
  type HighlightsPromo,
} from '@/components/sections/Highlights'
import { countryName } from '@/lib/countries'
import { formatDateRange, formatDay, formatLongDate, formatMediumDate } from '@/lib/dates'
import { resolveHref, safeHref, sharedRecordHref } from '@/lib/links'
import { picksThenFill } from '@/lib/picks'
import { toHeading } from '@/sanity/heading'
import { toImage } from '@/sanity/image'

import type { BlockProps } from './types'

// Items per source when the block's count is empty, and the most a block may show: HIGHLIGHTS_DEFAULT_COUNT and
// HIGHLIGHTS_ITEM_MAX in the schema. The fill tiers in fragments.ts fetch the most.
const DEFAULT_COUNT = { awards: 5, events: 4, research: 2 } as const
const MAX_COUNT = { awards: 5, events: 4, research: 3 } as const

function itemCount(source: Source, count: number | null | undefined): number {
  const value = stegaClean(count)

  return typeof value === 'number' && Number.isInteger(value) && value >= 1
    ? Math.min(value, MAX_COUNT[source])
    : DEFAULT_COUNT[source]
}

type Block = BlockProps<'highlights'>['block']
type HighlightRecord = NonNullable<NonNullable<Block['items']>[number]>
export type Source = 'awards' | 'events' | 'research'

/**
 * Date style of the meta lines: ClearView spells months out ("15 October 2026"); the publication homes use three
 * letters ("18 Nov 2026"), as their designs. Either way "date | place" with the divider.
 */
export type DateStyle = 'long' | 'short'

// The record type each source shows. A pick of another type (validation bypassed) is dropped.
const SOURCE_TYPES: { [S in Source]: HighlightRecord['_type'] } = {
  awards: 'awardsProgramme',
  events: 'conferenceEvent',
  research: 'resource',
}

export const isSource = (value: string | null | undefined): value is Source =>
  value === 'awards' || value === 'events' || value === 'research'

// Dates and codes are cleaned before parsing or lookup; the title keeps stega for click-to-edit.
// Dates and a country name, as events show them: "15 October 2026 | Singapore" ("15 Oct 2026 | Singapore" short).
function datesAndCountry(record: Pick<HighlightRecord, 'startDate' | 'endDate' | 'country'>, style: DateStyle): string[] {
  const dates = formatDateRange(stegaClean(record.startDate), stegaClean(record.endDate), {
    month: style === 'short' ? 'short' : 'long',
  })
  const country = countryName(stegaClean(record.country))

  return [dates, country].filter((part): part is string => Boolean(part))
}

/**
 * One rule for every award, picked or filled: open nominations show the deadline; closed or missing
 * nominations show the ceremony date and country. `today` is the UK date the page query ran with,
 * so the line agrees with the fill tiers and the cached result.
 */
export function recordMeta(
  record: Pick<HighlightRecord, 'nominationsClosingDate' | 'startDate' | 'endDate' | 'country' | 'publishedAt'>,
  source: Source,
  deadlineLabel: string | null | undefined,
  today: string,
  style: DateStyle = 'long',
): string[] {
  switch (source) {
    case 'awards': {
      // ISO calendar dates compare as strings, as `nominationsClosingDate >= $today` does in GROQ.
      const closing = stegaClean(record.nominationsClosingDate)
      // Publication homes (short style) show "date | country" even while nominations are open, as their design.
      const deadline = style === 'long' && closing && closing >= today ? formatDay(closing) : null

      if (!deadline) {
        return datesAndCountry(record, style)
      }

      // Cleaned only to test for emptiness; the rendered label keeps stega for click-to-edit.
      const label = stegaClean(deadlineLabel)?.trim() ? deadlineLabel?.trim() : null

      return [label ? `${label} ${deadline}` : deadline]
    }
    case 'events': {
      // An event without a readable date shows no meta line, not the country alone.
      const dated = formatDateRange(stegaClean(record.startDate), stegaClean(record.endDate)) !== null

      return dated ? datesAndCountry(record, style) : []
    }
    case 'research': {
      // Region is not shown: a resource has no region field.
      const publishedAt = stegaClean(record.publishedAt)
      const published = style === 'short' ? formatMediumDate(publishedAt) : formatLongDate(publishedAt)

      return published ? [published] : []
    }
  }
}

function toItem(
  record: HighlightRecord,
  source: Source,
  brand: BrandKey,
  deadlineLabel: Block['deadlineLabel'],
  today: string,
  style: DateStyle,
): HighlightsItem {
  return {
    key: record._id,
    title: record.title ?? '',
    // The final URL on ClearView; the detail pages are not built yet and 404 until they are.
    href: sharedRecordHref(record._type, record.slug, brand),
    // A brand whose design draws this source without meta lines gets none (events always keep theirs).
    meta: source === 'events' || showsListMeta(brand, source) ? recordMeta(record, source, deadlineLabel, today, style) : [],
  }
}

// `?dl=` makes the Sanity CDN answer with `Content-Disposition: attachment`, named after the uploaded file.
function fileDownloadHref(url: string | null | undefined, filename: string | null | undefined): string | null {
  const href = safeHref(url)

  return href ? `${href}?dl=${encodeURIComponent(stegaClean(filename) ?? '')}` : null
}

function toPromo(promo: Block['promo'], source: Source, brand: BrandKey): HighlightsPromo | null {
  if (!promo) {
    return null
  }

  // promo.resource is hidden outside Research; a value left behind after the source changed is ignored.
  const resource = source === 'research' ? promo.resource : null
  const title = promo.title || resource?.title

  if (!title) {
    return null
  }

  const image = toImage(promo.image) ?? toImage(resource?.downloadThumbnail)
  const href = resolveHref(promo.link, brand)
  // Interim until the client decides on lead capture: the PDF if present, else the form URL.
  const downloadHref = fileDownloadHref(resource?.downloadFileUrl, resource?.downloadFileName) ?? safeHref(resource?.downloadUrl)

  return {
    title,
    description: promo.description ?? undefined,
    image: image ?? undefined,
    href,
    downloadHref,
    report: source === 'research',
  }
}

export function Highlights({ block, brand, today }: BlockProps<'highlights'> & { today: string }) {
  const source = stegaClean(block.source)

  if (!isSource(source)) {
    return null
  }

  const type = SOURCE_TYPES[source]
  const count = itemCount(source, block.count)
  // Picks pointing at unpublished or deleted records dereference to null; a record of another type is dropped.
  // Fill tiers arrive in order (for example open nominations, then ceremonies ahead, then past editions); they order, the meta rule is per record.
  // The queries already exclude the picks and keep tiers disjoint; picksThenFill dedupes the merge anyway (shared with the Studio panel).
  const ofType = (records: (HighlightRecord | null)[] | null | undefined) =>
    (records ?? []).filter((record): record is HighlightRecord => record?._type === type)
  const entries: HighlightRecord[] = picksThenFill(ofType(block.items), ofType(block.fill), count)

  const buttonHref = resolveHref(block.button, brand)
  const buttonLabel = block.button?.label
  const publication = brand !== 'clearview'

  return (
    <HighlightsSection
      // Surface and icon come from code by source, not from the CMS.
      variant={source}
      look={publication ? 'publication' : 'group'}
      heading={toHeading(block.heading)}
      items={entries.map((record) =>
        toItem(record, source, brand, block.deadlineLabel, today, publication ? 'short' : 'long'),
      )}
      button={buttonHref && buttonLabel ? { label: buttonLabel, href: buttonHref } : null}
      promo={toPromo(block.promo, source, brand)}
    />
  )
}
