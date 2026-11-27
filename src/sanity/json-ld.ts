import { stegaClean } from 'next-sanity'

import { brandOrigin, isEditorialBrandKey, type BrandKey } from '@/brands'
import type { JsonLdNode } from '@/lib/json-ld'

import { toImage, toShareImage, type SanityImage } from './image'
import { clipDescription, fetchBrandSeo, plainText } from './seo'

/*
 * Structured data (JSON-LD) for search engines: typed builders for the schema.org nodes the pages describe, and the
 * serializer the <JsonLd> component renders. Every URL is absolute on a brand's configured origin (brandOrigin), never
 * on the request's host. Values may arrive with stega characters (draft mode): serializeJsonLd (src/lib/json-ld.ts)
 * cleans the whole tree.
 */

/** Drops empty properties (null, undefined, empty string or array) so the output carries only what the record has. */
function compact<T extends Record<string, unknown>>(node: T): T {
  return Object.fromEntries(
    Object.entries(node).filter(
      ([, value]) => value !== null && value !== undefined && value !== '' && !(Array.isArray(value) && value.length === 0),
    ),
  ) as T
}

/** An absolute URL on the brand's origin for a site path; an absolute URL is returned as it is. */
export function absoluteUrl(brand: BrandKey, href: string): string {
  return /^https?:\/\//i.test(href) ? href : `${brandOrigin(brand)}${href.startsWith('/') ? href : `/${href}`}`
}

const organizationId = (brand: BrandKey) => `${brandOrigin(brand)}/#organization`
const websiteId = (brand: BrandKey) => `${brandOrigin(brand)}/#website`

/** Logo height for the PNG rendition: Google asks for at least 112 pixels each way. */
const LOGO_HEIGHT = 160

/**
 * The brand logo as a raster image. Brand logos are SVG, which Google does not take as an Organization logo, so the
 * Sanity CDN renders them as PNG at LOGO_HEIGHT; a raster upload is passed at its own size.
 */
function logoImage(logo: { url: string; width: number | null; height: number | null } | null): JsonLdNode | null {
  const url = stegaClean(logo?.url)

  if (!url) {
    return null
  }

  if (!url.split('?', 1)[0]?.endsWith('.svg')) {
    return compact({ '@type': 'ImageObject', url, width: logo?.width, height: logo?.height })
  }

  const width = logo?.width && logo.height ? Math.round((logo.width / logo.height) * LOGO_HEIGHT) : null

  return compact({ '@type': 'ImageObject', url: `${url}?h=${LOGO_HEIGHT}&fm=png`, width, height: width ? LOGO_HEIGHT : null })
}

/**
 * The brand as an Organization: its Brand settings title, home page, PNG logo and profiles elsewhere (`sameAs`). The
 * three publications name ClearView as their parent organization. `full: false` gives the short form a page embeds as
 * publisher or organizer (id, name, url, logo); the home page carries the full node.
 */
export async function brandOrganization(brand: BrandKey, { full = false }: { full?: boolean } = {}): Promise<JsonLdNode> {
  const seo = await fetchBrandSeo(brand)
  const parent = full && isEditorialBrandKey(brand) ? await fetchBrandSeo('clearview') : null

  return compact({
    '@type': 'Organization',
    '@id': organizationId(brand),
    name: seo.siteName,
    url: brandOrigin(brand),
    logo: logoImage(seo.logo),
    ...(full
      ? {
          description: seo.description,
          sameAs: seo.profiles,
          parentOrganization: parent
            ? { '@type': 'Organization', '@id': organizationId('clearview'), name: parent.siteName, url: brandOrigin('clearview') }
            : null,
        }
      : {}),
  })
}

/**
 * The brand's site as a WebSite: name, home page, publisher and the site search (/search?q=, every brand has it).
 * "Name in titles" becomes the alternate name when it differs from the brand title.
 */
export async function brandWebSite(brand: BrandKey): Promise<JsonLdNode> {
  const seo = await fetchBrandSeo(brand)
  const origin = brandOrigin(brand)

  return compact({
    '@type': 'WebSite',
    '@id': websiteId(brand),
    name: seo.siteName,
    alternateName: seo.titleName !== seo.siteName ? seo.titleName : null,
    url: origin,
    inLanguage: 'en-GB',
    publisher: { '@id': organizationId(brand) },
    potentialAction: {
      '@type': 'SearchAction',
      target: { '@type': 'EntryPoint', urlTemplate: `${origin}/search?q={search_term_string}` },
      'query-input': 'required name=search_term_string',
    },
  })
}

/** One breadcrumb item as the visible trail holds it: a label and, except on the current page, a site path. */
export type BreadcrumbCrumb = { label?: string | null; href?: string | null }

/**
 * A BreadcrumbList from a visible trail on `brand`'s host. The last item is the page itself (`pageUrl`); an earlier
 * item without a link (plain text in the trail) has no page to point at and is left out. Null under two items.
 */
export function breadcrumbList(brand: BrandKey, crumbs: BreadcrumbCrumb[], pageUrl: string): JsonLdNode | null {
  const items = crumbs.flatMap((crumb, index) => {
    const name = plainText(crumb.label)
    const last = index === crumbs.length - 1
    const href = stegaClean(crumb.href)

    if (!name || (!last && !href)) {
      return []
    }

    return [{ name, item: last ? pageUrl : absoluteUrl(brand, href ?? '') }]
  })

  if (items.length < 2) {
    return null
  }

  return {
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({ '@type': 'ListItem', position: index + 1, ...item })),
  }
}

/**
 * An ItemList of the records a listing page shows, in order (the summary-page form: position and URL only). Links are
 * site paths on `brand`'s host or absolute URLs; duplicates and empty links are dropped. Null when nothing is listed.
 */
export function itemList(brand: BrandKey, hrefs: (string | null | undefined)[]): JsonLdNode | null {
  const urls = [
    ...new Set(hrefs.map((href) => stegaClean(href)).filter((href): href is string => Boolean(href)).map((href) => absoluteUrl(brand, href))),
  ]

  return urls.length > 0
    ? {
        '@type': 'ItemList',
        itemListElement: urls.map((url, index) => ({ '@type': 'ListItem', position: index + 1, url })),
      }
    : null
}

/** A person named on a page: author, speaker or judge. There are no person pages, so no URL. */
export type PersonInput = {
  name?: string | null
  jobTitle?: string | null
  company?: string | null
  photo?: SanityImage | null
}

const PERSON_IMAGE_WIDTH = 400

/** A Person with job title, employer and photo where the record has them. Null without a name. */
export function person(input: PersonInput | null | undefined): JsonLdNode | null {
  const name = plainText(input?.name)

  if (!name) {
    return null
  }

  const company = plainText(input?.company)
  const photo = toImage(input?.photo)
  const svg = photo?.src.split('?', 1)[0]?.endsWith('.svg')
  const image = photo && !svg ? `${photo.src}${photo.src.includes('?') ? '&' : '?'}w=${PERSON_IMAGE_WIDTH}` : null

  return compact({
    '@type': 'Person',
    name,
    jobTitle: plainText(input?.jobTitle),
    worksFor: company ? { '@type': 'Organization', name: company } : null,
    image,
  })
}

/** People listed once each, by name, in order. */
function people(inputs: (PersonInput | null | undefined)[]): JsonLdNode[] {
  const seen = new Set<string>()

  return inputs.flatMap((input) => {
    const node = person(input)
    const key = typeof node?.name === 'string' ? node.name.toLowerCase() : ''

    if (!node || seen.has(key)) {
      return []
    }

    seen.add(key)

    return [node]
  })
}

// The three aspect ratios Google suggests for article and event images, 1200 pixels wide.
const IMAGE_CROPS = [
  { width: 1200, height: 675 },
  { width: 1200, height: 900 },
  { width: 1200, height: 1200 },
] as const

/** An image in Google's three ratios (16:9, 4:3, 1:1) cut around the hotspot on the Sanity CDN. Empty without one. */
function imageCrops(image: SanityImage | null): string[] {
  return IMAGE_CROPS.flatMap((size) => toShareImage(image, size)?.url ?? [])
}

const HEADLINE_MAX = 110

/** A headline of at most 110 characters, cut at a word with an ellipsis when longer. */
function headline(value: string | null | undefined): string {
  const text = plainText(value)

  if (text.length <= HEADLINE_MAX) {
    return text
  }

  const word = text.lastIndexOf(' ', HEADLINE_MAX - 1)

  return `${text.slice(0, word > HEADLINE_MAX / 2 ? word : HEADLINE_MAX - 1).replace(/[\s,.;:]+$/, '')}…`
}

/** A description: the editor's meta description, else the record's own text cut as the meta description is. */
const describe = (seoDescription: string | null | undefined, text: string | null | undefined) =>
  plainText(seoDescription) || clipDescription(text) || null

export type NewsArticleInput = {
  /** The canonical URL (the canonical brand's origin, or the editor's override). */
  url: string
  /** The canonical brand: the publisher. */
  publisher: BrandKey
  title: string | null | undefined
  seoDescription?: string | null
  /** The standfirst, used when the SEO description is empty. */
  excerpt?: string | null
  /** The share image source (seo.image, else the post image), without the brand default. */
  image: SanityImage | null
  publishedAt?: string | null
  updatedAt?: string | null
  section?: string | null
  author?: PersonInput | null
}

/** A post as a NewsArticle. */
export async function newsArticle(input: NewsArticleInput): Promise<JsonLdNode> {
  const publishedAt = stegaClean(input.publishedAt)

  return compact({
    '@type': 'NewsArticle',
    '@id': `${input.url}#article`,
    headline: headline(input.title),
    description: describe(input.seoDescription, input.excerpt),
    image: imageCrops(input.image),
    datePublished: publishedAt,
    dateModified: stegaClean(input.updatedAt) || publishedAt,
    author: person(input.author),
    publisher: await brandOrganization(input.publisher),
    mainEntityOfPage: { '@type': 'WebPage', '@id': input.url },
    url: input.url,
    articleSection: plainText(input.section),
    inLanguage: 'en-GB',
    isAccessibleForFree: true,
  })
}

export type EventInput = {
  /** The canonical URL. */
  url: string
  name: string | null | undefined
  seoDescription?: string | null
  /** The record's own text, used when the SEO description is empty. */
  description?: string | null
  /** The share image source (seo.image, else the record's raster images), without the brand default. */
  image: SanityImage | null
  /** `YYYY-MM-DD`. Without it there is no Event. */
  startDate: string | null | undefined
  endDate?: string | null
  /** `HH:MM`, local to the venue: no time zone is stored as an offset. */
  startTime?: string | null
  endTime?: string | null
  /** "Hide date and time": the dates are not confirmed, so the record is not described as an event. */
  hideDateTime?: boolean | null
  /** A webinar is held online; every other event and awards ceremony in person. */
  online: boolean
  venue?: { name?: string | null; address?: string | null } | null
  /** ISO 3166 alpha-2. */
  country?: string | null
  speakers?: (PersonInput | null | undefined)[]
  judges?: (PersonInput | null | undefined)[]
}

const DATE = /^\d{4}-\d{2}-\d{2}$/
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/

/** `YYYY-MM-DD` with `THH:MM` when a valid time is given; null without a valid date. */
function dateTime(date: string | null | undefined, time: string | null | undefined): string | null {
  const day = stegaClean(date)?.trim()
  const clock = stegaClean(time)?.trim()

  if (!day || !DATE.test(day)) {
    return null
  }

  return clock && TIME.test(clock) ? `${day}T${clock}` : day
}

/** The venue as a Place (name and address as typed, with the country), else null without any of them. */
function place(venue: EventInput['venue'], country: string | null | undefined): JsonLdNode | null {
  const name = plainText(venue?.name)
  const street = plainText(venue?.address)
  const code = plainText(country).toUpperCase()

  if (!name && !street && !code) {
    return null
  }

  return compact({
    '@type': 'Place',
    name,
    address: street || code ? compact({ '@type': 'PostalAddress', streetAddress: street, addressCountry: code }) : null,
  })
}

/**
 * A conference event or an awards edition as an Event, organised by ClearView: dates (with times when stored), status,
 * attendance mode and location (a Place, or the page itself as the VirtualLocation of a webinar), speakers as
 * performers and judges as contributors. Null without a start date, or while the dates are hidden.
 */
export async function event(input: EventInput): Promise<JsonLdNode | null> {
  const startDate = dateTime(input.startDate, input.startTime)

  if (!startDate || stegaClean(input.hideDateTime)) {
    return null
  }

  const endDate = dateTime(input.endDate || input.startDate, input.endTime)

  return compact({
    '@type': 'Event',
    '@id': `${input.url}#event`,
    name: plainText(input.name),
    description: describe(input.seoDescription, input.description),
    url: input.url,
    image: imageCrops(input.image),
    startDate,
    endDate,
    eventStatus: 'https://schema.org/EventScheduled',
    eventAttendanceMode: input.online
      ? 'https://schema.org/OnlineEventAttendanceMode'
      : 'https://schema.org/OfflineEventAttendanceMode',
    location: input.online ? { '@type': 'VirtualLocation', url: input.url } : place(input.venue, input.country),
    organizer: await brandOrganization('clearview'),
    performer: people(input.speakers ?? []),
    contributor: people(input.judges ?? []),
    inLanguage: 'en-GB',
  })
}

/** Questions and answers shown on the page as an FAQPage. Pairs without both texts are skipped; null when none is left. */
export function faqPage(url: string, items: { question?: string | null; answer?: string | null }[]): JsonLdNode | null {
  const entities = items.flatMap((item) => {
    const question = plainText(item.question)
    const answer = plainText(item.answer)

    return question && answer
      ? [{ '@type': 'Question', name: question, acceptedAnswer: { '@type': 'Answer', text: answer } }]
      : []
  })

  return entities.length > 0 ? { '@type': 'FAQPage', '@id': `${url}#faq`, url, mainEntity: entities } : null
}

/** The page blocks that draw the "Home / page" trail above their heading. */
const TRAIL_BLOCKS = new Set(['pageHero', 'imageHero', 'overlayHero', 'contactForm', 'legalText'])

type TrailBlock = {
  _type?: string
  showBreadcrumb?: boolean | null
  breadcrumbHomeLabel?: string | null
  breadcrumbLabel?: string | null
  main?: readonly unknown[] | null
}

/**
 * The visible trail of a page built from blocks: the first heading block that draws one (at the top level or in a Two
 * columns main column) gives "Home / {its label}". Null when no block draws a trail.
 */
export function blocksBreadcrumb(blocks: readonly unknown[] | null | undefined): BreadcrumbCrumb[] | null {
  for (const value of blocks ?? []) {
    const block = value as TrailBlock
    const type = stegaClean(block._type) ?? ''

    if (TRAIL_BLOCKS.has(type) && !(type === 'pageHero' && block.showBreadcrumb === false)) {
      return [{ label: block.breadcrumbHomeLabel, href: '/' }, { label: block.breadcrumbLabel }]
    }

    if (type === 'splitLayout') {
      const found = blocksBreadcrumb(block.main)

      if (found) {
        return found
      }
    }
  }

  return null
}
