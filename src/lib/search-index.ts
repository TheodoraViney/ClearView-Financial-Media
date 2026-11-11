// The site search index: one Algolia record per archived article, post, conference event, awards edition and resource.
// No server imports here, so the indexing scripts can run it under bun.

import { toImage } from '@/sanity/image'

import { archivePlainText, type ArchiveRecord } from './archive'
import { countryName } from './countries'

/** The one index every environment reads. Records count across all indices on the plan, so there is no copy per environment. */
export const SEARCH_INDEX = 'wb_content'

/** Header suggestion section a record shows in. Also the `distinct` attribute, so one query returns every section. */
export type SearchSection = 'posts' | 'events' | 'awards' | 'resources'

/**
 * A result card's thumbnail. A Sanity image is its CDN URL with the editor's crop and no width (the image loader adds
 * one per srcset entry), the cropped pixel size and the alt text, the field's or the media library's; an archive image
 * is an `/archive-media/` path with no known size or alt (the export holds none). The card falls back to the title.
 */
export type SearchImage = { src: string; width?: number; height?: number; alt?: string }

export type SearchRecord = {
  objectID: string
  /** `archive` for a legacy article, else the Sanity document type. */
  kind: 'archive' | 'post' | 'conferenceEvent' | 'awardsProgramme' | 'resource'
  section: SearchSection
  title: string
  standfirst: string | null
  author: string | null
  /** Archive type label ("Feature") or the post category. */
  type: string | null
  /** The start of the body text. Full bodies are not indexed, to keep records small. */
  extract: string | null
  /** Editorial brand keys of an article, the first is its home. Empty for shared records, which show on every host. */
  publications: string[]
  /** Archive slug or Sanity slug; the href is built per host when the result is shown. */
  slug: string
  /** Archive legacy id, for its URL. */
  archiveId?: number
  /** "2020-01-31" or an ISO datetime: the publication date, or an event's start. */
  date: string | null
  endDate?: string | null
  hideDateTime?: boolean
  /** Unix seconds of `date`, for the "newer first" tie-break. 0 when undated. */
  timestamp: number
  /** The year of `date`, the results page's year facet. Left out when undated. */
  year?: string
  image: SearchImage | null
  /** `contain` for a research cover or an event logo, which must show whole; else the thumbnail crops to fill. */
  imageFit?: 'contain'
  /** The legacy category of an archived article, a post's category. */
  category: string | null
  /** A post's region, an archived article's country or region, an event's or awards edition's country name. */
  location: string | null
  /** "Summit", "Briefing" or "Webinar" on a conference event. */
  eventType: string | null
}

const EXTRACT_LENGTH = 300

/** Plain text cut to about `length` characters at a word boundary. */
function cut(text: string | null | undefined, length: number): string | null {
  const clean = text?.replace(/\s+/g, ' ').trim()

  if (!clean) {
    return null
  }

  if (clean.length <= length) {
    return clean
  }

  const end = clean.lastIndexOf(' ', length)

  return clean.slice(0, end > length / 2 ? end : length)
}

function timestampOf(date: string | null | undefined): number {
  const time = date ? Date.parse(date) : Number.NaN

  return Number.isNaN(time) ? 0 : Math.floor(time / 1000)
}

/** The `timestamp` and `year` of a date; the year is left out when undated. */
function dated(date: string | null | undefined): Pick<SearchRecord, 'timestamp' | 'year'> {
  const year = date?.match(/^\d{4}(?=-)/)?.[0]

  return { timestamp: timestampOf(date), ...(year ? { year } : {}) }
}

const text = (value: string | null | undefined) => value?.trim() || null

/**
 * The record of an archived article. Every article is indexed: the legacy `excludeFromSearch` flag marks everything
 * before 2022, the window the old site searched, and the new site searches the whole archive.
 */
export function archiveSearchRecord(record: ArchiveRecord): SearchRecord {
  const home = record.publications[0]
  // Only archive media loads on the site, the same rule as the archive article page; external URLs are dropped.
  const image = record.media.image?.startsWith('/archive-media/') ? record.media.image : null

  return {
    objectID: `archive-${record.id}`,
    kind: 'archive',
    section: 'posts',
    title: record.title,
    standfirst: cut(record.standfirst && archivePlainText(record.standfirst), 500),
    author: record.author?.name?.trim() || null,
    type: (home && record.types[home]) || null,
    extract: cut(archivePlainText(record.bodyHtml), EXTRACT_LENGTH),
    publications: record.publications,
    slug: record.slug,
    archiveId: record.id,
    date: record.date,
    ...dated(record.date),
    image: image ? { src: image } : null,
    category: text(record.taxonomy?.categories?.[0]),
    location: text(record.taxonomy?.country) ?? text(record.taxonomy?.region),
    eventType: null,
  }
}

/** One published CMS document as SEARCH_RECORDS_QUERY returns it. */
export type CmsSearchSource = {
  _id: string
  _type: string
  title: string | null
  slug: string | null
  brands?: string[] | null
  excerpt?: string | null
  author?: string | null
  category?: string | null
  bodyText?: string | null
  publishedAt?: string | null
  startDate?: string | null
  endDate?: string | null
  hideDateTime?: boolean | null
  region?: string | null
  /** ISO 3166-1 alpha-2 code of an event or awards edition. */
  country?: string | null
  eventType?: string | null
  /** A post's image, a resource's download thumbnail, or the first photograph of an event or awards edition. */
  image?: CmsSearchImage | null
  logo?: CmsSearchImage | null
}

type CmsSearchImage = Parameters<typeof toImage>[0]

/** The URL, cropped size and alt text of a Sanity image; the hotspot stays out of the record. */
function searchImage(image: CmsSearchImage): SearchImage | null {
  const value = toImage(image)
  const alt = value?.alt.trim()

  return value ? { src: value.src, width: value.width, height: value.height, ...(alt ? { alt } : {}) } : null
}

/** The thumbnail: posts and events crop to fill, a resource cover and an event logo show whole. */
function cmsImage(doc: CmsSearchSource, kind: SearchRecord['kind']): Pick<SearchRecord, 'image' | 'imageFit'> {
  const image = searchImage(doc.image)

  if (kind === 'resource') {
    return image ? { image, imageFit: 'contain' } : { image: null }
  }

  if (image || kind === 'post') {
    return { image }
  }

  const logo = searchImage(doc.logo)

  return logo ? { image: logo, imageFit: 'contain' } : { image: null }
}

/** "summit" → "Summit": the option titles of the event type field are its values capitalised. */
function eventTypeLabel(value: string | null | undefined): string | null {
  const type = text(value)

  return type && type[0].toUpperCase() + type.slice(1)
}

const CMS_SECTIONS: Record<string, { kind: SearchRecord['kind']; section: SearchSection }> = {
  post: { kind: 'post', section: 'posts' },
  conferenceEvent: { kind: 'conferenceEvent', section: 'events' },
  awardsProgramme: { kind: 'awardsProgramme', section: 'awards' },
  resource: { kind: 'resource', section: 'resources' },
}

/** The record of a published CMS document, or null when it has no title, slug or searchable type. */
export function cmsSearchRecord(doc: CmsSearchSource): SearchRecord | null {
  const target = CMS_SECTIONS[doc._type]
  const title = doc.title?.trim()
  const slug = doc.slug?.trim()

  if (!target || !title || !slug) {
    return null
  }

  const shared = target.kind === 'conferenceEvent' || target.kind === 'awardsProgramme'
  const date = (shared ? doc.startDate : doc.publishedAt) ?? null

  return {
    objectID: doc._id,
    ...target,
    title,
    standfirst: cut(doc.excerpt, 500),
    author: doc.author?.trim() || null,
    type: doc.category?.trim() || null,
    extract: cut(doc.bodyText, EXTRACT_LENGTH),
    publications: target.kind === 'post' ? (doc.brands ?? []) : [],
    slug,
    date,
    ...(target.section === 'events' || target.section === 'awards'
      ? { endDate: doc.endDate ?? null, hideDateTime: Boolean(doc.hideDateTime) }
      : {}),
    ...dated(date),
    ...cmsImage(doc, target.kind),
    category: target.kind === 'post' ? text(doc.category) : null,
    location: shared ? countryName(doc.country) : target.kind === 'post' ? text(doc.region) : null,
    eventType: target.kind === 'conferenceEvent' ? eventTypeLabel(doc.eventType) : null,
  }
}

/**
 * Index settings, applied by the indexing script. Matching runs on the headline, standfirst, author, type and the
 * extract, in that order of weight; among equally relevant results the newer one ranks first. No replicas: each one
 * would copy every record and double the record bill.
 */
export const SEARCH_INDEX_SETTINGS = {
  searchableAttributes: ['title', 'standfirst', 'author', 'type', 'extract'],
  customRanking: ['desc(timestamp)'],
  // `section` and `year` are facets with counts: the results page's type chips and year options.
  attributesForFaceting: ['filterOnly(publications)', 'section', 'year'],
  attributeForDistinct: 'section',
  attributesToRetrieve: ['kind', 'section', 'title', 'publications', 'slug', 'archiveId', 'date', 'endDate', 'hideDateTime'],
  attributesToHighlight: [],
  attributesToSnippet: [],
  ignorePlurals: ['en'],
  queryLanguages: ['en'],
}
