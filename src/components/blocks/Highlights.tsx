import { stegaClean } from 'next-sanity'

import type { BrandKey } from '@/brands'
import {
  Highlights as HighlightsSection,
  type HighlightsItem,
  type HighlightsPromo,
} from '@/components/sections/Highlights'
import { countryName } from '@/lib/countries'
import { formatDateRange, formatDay, formatLongDate } from '@/lib/dates'
import { resolveHref, safeHref, sharedRecordHref } from '@/lib/links'
import { toHeading } from '@/sanity/heading'
import { urlFor } from '@/sanity/image'

import type { BlockProps } from './types'

const ITEM_COUNT = 3

// The promo thumbnail is 40px at most; twice that for 2x screens.
const PROMO_IMAGE_WIDTH = 80

type Block = BlockProps<'highlights'>['block']
type HighlightRecord = NonNullable<NonNullable<Block['items']>[number]>
type FillRecord = NonNullable<Block['fill']>[number]
// Picks carry no tier; fill records say which fallback tier produced them.
type Entry = HighlightRecord & { tier?: FillRecord['tier'] }
type Source = 'awards' | 'events' | 'research'

// The record type each source shows. A pick of another type (validation bypassed) is dropped.
const SOURCE_TYPES: { [S in Source]: HighlightRecord['_type'] } = {
  awards: 'awardsProgramme',
  events: 'conferenceEvent',
  research: 'resource',
}

const isSource = (value: string | null | undefined): value is Source =>
  value === 'awards' || value === 'events' || value === 'research'

// Dates and codes are cleaned before parsing or lookup; the title keeps stega for click-to-edit.
// Dates and a country name, as events show them: "15 October 2026 | Singapore".
function datesAndCountry(record: Entry): string[] {
  const dates = formatDateRange(stegaClean(record.startDate), stegaClean(record.endDate))
  const country = countryName(stegaClean(record.country))

  return [dates, country].filter((part): part is string => Boolean(part))
}

function metaOf(record: Entry, source: Source): string[] {
  switch (source) {
    case 'awards': {
      // Fallback editions with nominations closed show the ceremony date instead of a deadline that has passed.
      const tier = stegaClean(record.tier)

      if (tier === 'ahead' || tier === 'past') {
        return datesAndCountry(record)
      }

      // Hard-coded prefix for now: whether visible copy moves to the CMS is an open question.
      const deadline = formatDay(stegaClean(record.nominationsClosingDate))

      return deadline ? [`Entry deadline: ${deadline}`] : []
    }
    case 'events':
      return datesAndCountry(record)
    case 'research': {
      // Region is not shown: a resource has no region field.
      const published = formatLongDate(stegaClean(record.publishedAt))

      return published ? [published] : []
    }
  }
}

function toItem(record: Entry, source: Source, brand: BrandKey): HighlightsItem {
  return {
    key: record._id,
    title: record.title ?? '',
    // The final URL on ClearView; the detail pages are not built yet and 404 until they are.
    href: sharedRecordHref(record._type, record.slug, brand),
    meta: metaOf(record, source),
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

  const image = promo.image?.asset ? promo.image : resource?.downloadThumbnail?.asset ? resource.downloadThumbnail : null
  const href = resolveHref(promo.link, brand)
  // Interim until the client decides on lead capture: the PDF if present, else the form URL.
  const downloadHref = fileDownloadHref(resource?.downloadFileUrl, resource?.downloadFileName) ?? safeHref(resource?.downloadUrl)

  return {
    title,
    description: promo.description ?? undefined,
    image: image
      ? {
          src: urlFor(image).width(PROMO_IMAGE_WIDTH).fit('max').auto('format').url(),
          // Inside the same link as the title (whole row is a link) the image is decorative; otherwise it stands alone.
          alt: href && !downloadHref ? '' : (stegaClean(image.alt) ?? ''),
        }
      : undefined,
    href,
    downloadHref,
    report: source === 'research',
  }
}

export function Highlights({ block, brand }: BlockProps<'highlights'>) {
  const source = stegaClean(block.source)

  if (!isSource(source)) {
    return null
  }

  const type = SOURCE_TYPES[source]
  // Picks pointing at unpublished or deleted records dereference to null.
  const picks = (block.items ?? []).filter((record): record is HighlightRecord => record?._type === type).slice(0, ITEM_COUNT)
  // Fill tiers arrive in order (for example open nominations, then ceremonies ahead, then past editions).
  // The queries already exclude the picks and keep tiers disjoint; the dedupe guards the merge anyway.
  const seen = new Set(picks.map((record) => record._id))
  const fill = (block.fill ?? []).filter((record) => {
    if (record._type !== type || seen.has(record._id)) {
      return false
    }

    seen.add(record._id)

    return true
  })
  const entries: Entry[] = [...picks, ...fill].slice(0, ITEM_COUNT)

  const buttonHref = resolveHref(block.button, brand)
  const buttonLabel = block.button?.label

  return (
    <HighlightsSection
      // Surface and icon come from code by source, not from the CMS.
      variant={source}
      heading={toHeading(block.heading)}
      items={entries.map((record) => toItem(record, source, brand))}
      button={buttonHref && buttonLabel ? { label: buttonLabel, href: buttonHref } : null}
      promo={toPromo(block.promo, source, brand)}
    />
  )
}
