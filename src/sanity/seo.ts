import type { Metadata } from 'next'
import { stegaClean } from 'next-sanity'

import { brandOrigin, type BrandKey } from '@/brands'

import { brandTitle, fetchShell } from './brand-title'
import { toImage, toShareImage, type SanityImage } from './image'
import type { DynamicFetchOptions } from './live'

/** The projected `seo` object. Every field may be empty, and a document from before the SEO tab has none. */
export type SeoFields =
  | {
      title?: string | null
      description?: string | null
      image?: SanityImage | null
      canonical?: string | null
      noIndex?: boolean | null
    }
  | null
  | undefined

/** Metadata reads published content without stega, so it shares the published pages' cache entries. */
export const SEO_FETCH: DynamicFetchOptions = { perspective: 'published', stega: false }

const DESCRIPTION_MAX = 160
const DESCRIPTION_MIN = 70

/** Stega-clean text with its whitespace collapsed; empty string when there is none. */
export const plainText = (value: string | null | undefined): string =>
  (stegaClean(value) ?? '').replace(/\s+/g, ' ').trim()

/**
 * A meta description from plain text, at most 160 characters: the whole text when it fits, else the longest run of
 * whole sentences that fits (when that is at least 70 characters), else the text cut at a word with an ellipsis.
 * Null when empty.
 */
export function clipDescription(value: string | null | undefined): string | null {
  const text = plainText(value)

  if (!text) {
    return null
  }

  if (text.length <= DESCRIPTION_MAX) {
    return text
  }

  const head = text.slice(0, DESCRIPTION_MAX + 1)
  let sentenceEnd = -1

  for (const match of head.matchAll(/[.!?](?=\s|$)/g)) {
    if (match.index + 1 <= DESCRIPTION_MAX) {
      sentenceEnd = match.index + 1
    }
  }

  if (sentenceEnd >= DESCRIPTION_MIN) {
    return text.slice(0, sentenceEnd)
  }

  const word = text.lastIndexOf(' ', DESCRIPTION_MAX - 1)

  return `${text.slice(0, word > DESCRIPTION_MAX / 2 ? word : DESCRIPTION_MAX - 1).replace(/[\s,.;:]+$/, '')}…`
}

/**
 * An image that can be shared: it has an asset and is not an SVG, which link previews do not show. A record's own
 * image (not one chosen as a share image) must also be at least SHARE_MIN_WIDTH wide after its crop, so a thumbnail
 * is not blown up to 1200 pixels.
 */
function shareable(image: SanityImage | null | undefined, minWidth = 0): SanityImage | null {
  const media = toImage(image)

  return media && !media.src.split('?', 1)[0]?.endsWith('.svg') && media.width >= minWidth ? (image ?? null) : null
}

const SHARE_MIN_WIDTH = 600

/** An https URL typed by an editor, else null. */
function httpsUrl(value: string | null | undefined): string | null {
  const url = plainText(value)

  return /^https:\/\/[^\s]+$/i.test(url) ? url : null
}

/** "@handle" from an X handle typed with or without the @, else null. */
function xHandle(value: string | null | undefined): string | null {
  const handle = plainText(value).replace(/^@/, '')

  return /^[A-Za-z0-9_]{1,15}$/.test(handle) ? `@${handle}` : null
}

/** The brand's search and share defaults from Brand settings, through the brand layout's shell cache entry. */
export async function fetchBrandSeo(brand: BrandKey) {
  const { data } = await fetchShell(brand, SEO_FETCH)
  const settings = data.brand

  return {
    /** The brand title, for og:site_name. */
    siteName: stegaClean(brandTitle(brand, settings?.title)),
    /** "Name in titles", else the brand title: the brand part of every <title>. */
    titleName: plainText(settings?.seoSiteName) || stegaClean(brandTitle(brand, settings?.title)),
    description: plainText(settings?.seoDescription) || null,
    image: shareable(settings?.seoImage),
    favicon: settings?.favicon ?? null,
    xHandle: xHandle(settings?.xHandle),
  }
}

export type PageMetadataInput = {
  /** The brand of the host being rendered: its defaults, site name and X handle. */
  brand: BrandKey
  /** The page's own path, without query string, on the canonical brand's origin. Null: no canonical. */
  path: string | null
  /** The brand whose origin the canonical uses and whose title is og:site_name, when it differs from the host's (a post's first brand). */
  canonicalBrand?: BrandKey
  /** The document's `seo` object. */
  seo?: SeoFields
  /** The record's own title, used when `seo.title` is empty. */
  title?: string | null
  /**
   * The whole page title, replacing `seo.title` and `title` (for example a category with its programme). The brand
   * layout's template still adds the brand.
   */
  pageTitle?: string | null
  /** The record's own text (standfirst, intro, summary), used when `seo.description` is empty; cut to 160 characters. */
  description?: string | null
  /** The record's own images in order of preference, used when `seo.image` is empty. SVGs are skipped. */
  images?: (SanityImage | null | undefined)[]
  /** Noindex whatever `seo.noIndex` says, such as a filtered listing view. */
  noIndex?: boolean
  /** The brand's home page: the title reads "{brand} | {seo title}", or the brand title alone. */
  home?: boolean
  /** Open Graph article fields; their presence makes og:type `article`. */
  article?: {
    publishedTime?: string | null
    modifiedTime?: string | null
    section?: string | null
    authors?: (string | null | undefined)[]
  }
}

/**
 * A page's metadata from its `seo` object, its own content and the brand's defaults, in that order of preference:
 * title, description, canonical, robots, Open Graph and X card. The brand layout adds the brand to the title and sets
 * `metadataBase` and the icons. Pass stega-free values (published, `stega: false`); text is cleaned once more anyway.
 */
export async function pageMetadata(input: PageMetadataInput): Promise<Metadata> {
  const { brand, seo } = input
  // The canonical brand names the site in link previews, so a post shared from a second brand's host shows its own.
  const [defaults, canonicalDefaults] = await Promise.all([
    fetchBrandSeo(brand),
    input.canonicalBrand && input.canonicalBrand !== brand ? fetchBrandSeo(input.canonicalBrand) : null,
  ])

  const ownTitle = plainText(input.pageTitle) || plainText(seo?.title) || plainText(input.title)
  // Home pages lead with the brand, as the legacy home pages did; any other page gets " | {brand}" from the template.
  const title: Metadata['title'] = input.home
    ? { absolute: ownTitle ? `${defaults.titleName} | ${ownTitle}` : defaults.siteName }
    : ownTitle || undefined
  const shareTitle = input.home ? (ownTitle ? `${defaults.titleName} | ${ownTitle}` : defaults.siteName) : ownTitle || defaults.siteName

  const description =
    plainText(seo?.description) || clipDescription(input.description) || defaults.description || undefined

  const canonical =
    httpsUrl(seo?.canonical) ?? (input.path ? `${brandOrigin(input.canonicalBrand ?? brand)}${input.path}` : undefined)

  const source =
    shareable(seo?.image) ??
    (input.images ?? []).map((image) => shareable(image, SHARE_MIN_WIDTH)).find(Boolean) ??
    defaults.image
  const shareImage = toShareImage(source)
  const image = shareImage ? { ...shareImage, alt: shareImage.alt || shareTitle } : null

  const article = input.article
  const authors = (article?.authors ?? []).map(plainText).filter(Boolean)

  return {
    title,
    description,
    ...(canonical ? { alternates: { canonical } } : {}),
    ...(input.noIndex || seo?.noIndex ? { robots: { index: false, follow: true } } : {}),
    openGraph: {
      ...(article
        ? {
            type: 'article' as const,
            ...(article.publishedTime ? { publishedTime: stegaClean(article.publishedTime) } : {}),
            ...(article.modifiedTime ? { modifiedTime: stegaClean(article.modifiedTime) } : {}),
            ...(plainText(article.section) ? { section: plainText(article.section) } : {}),
            ...(authors.length ? { authors } : {}),
          }
        : { type: 'website' as const }),
      title: shareTitle,
      description,
      url: canonical,
      siteName: (canonicalDefaults ?? defaults).siteName,
      locale: 'en_GB',
      images: image ? [image] : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      ...(defaults.xHandle ? { site: defaults.xHandle } : {}),
      title: shareTitle,
      description,
      images: image ? [{ url: image.url, alt: image.alt }] : undefined,
    },
  }
}

const FAVICON_SIZES = [32, 192] as const
const APPLE_ICON_SIZE = 180

/**
 * The brand's favicon from Brand settings as explicit links: an SVG as itself (any size) with PNG renditions for
 * browsers without SVG favicons, a PNG resized on the Sanity CDN; plus a 180×180 PNG apple-touch icon. Undefined
 * without a favicon: browsers then ask for /favicon.ico, the generic fallback.
 */
export function brandIcons(favicon: SanityImage | null | undefined): Metadata['icons'] {
  const media = toImage(favicon ? { asset: favicon.asset } : null)

  if (!media) {
    return undefined
  }

  const base = media.src.split('?', 1)[0] ?? media.src
  const svg = base.endsWith('.svg')
  const png = (size: number) => `${base}?w=${size}&h=${size}&fit=crop&fm=png`

  return {
    icon: [
      ...(svg ? [{ url: base, type: 'image/svg+xml', sizes: 'any' }] : []),
      ...FAVICON_SIZES.map((size) => ({ url: png(size), type: 'image/png', sizes: `${size}x${size}` })),
    ],
    apple: [{ url: png(APPLE_ICON_SIZE), type: 'image/png', sizes: `${APPLE_ICON_SIZE}x${APPLE_ICON_SIZE}` }],
  }
}
