import { stegaClean } from '@sanity/client/stega'

import { brandOrigin, isBrandKey, type BrandKey } from '@/brands'

/** Slug that marks a brand's home page. The GROQ queries match the same literal. */
export const HOME_PAGE_SLUG = 'home'

/** Document types an internal link may reference. */
export const LINKABLE_TYPES = [
  'page',
  'post',
  'conferenceEvent',
  'awardsProgramme',
  'resource',
] as const

// Browsers strip tabs and newlines from URLs before parsing them, so "/\t/evil.com" becomes "//evil.com".
const CONTROL_CHARACTERS = /[\u0000-\u001F\u007F]/

const ABSOLUTE_PREFIXES = /^(https?:\/\/|mailto:|tel:)/i

// A single leading slash. "//host" and "/\host" are protocol-relative in browsers and leave the site.
const SITE_RELATIVE = /^\/(?![/\\])/

/**
 * The link target rule shared by Studio validation and the runtime guard:
 * `http://`, `https://`, `mailto:`, `tel:`, or a site-relative path starting
 * with a single `/`. Everything else, `javascript:` and `//host` included, is
 * rejected.
 */
export function isAllowedLinkTarget(value: string): boolean {
  if (CONTROL_CHARACTERS.test(value)) {
    return false
  }

  return SITE_RELATIVE.test(value) || ABSOLUTE_PREFIXES.test(value)
}

/**
 * Runtime allowlist for any CMS-authored href. Studio validation is not a
 * guard: the Content API accepts writes that never ran it. Also allows an
 * in-page `#anchor`. Returns null when the value must not be rendered.
 */
export function safeHref(value: string | null | undefined): string | null {
  if (!value) {
    return null
  }

  const href = stegaClean(value).trim()

  if (href.startsWith('#') && !CONTROL_CHARACTERS.test(href)) {
    return href
  }

  return isAllowedLinkTarget(href) ? href : null
}

/** The shape the LINK GROQ fragment returns. */
export type ResolvableLink = {
  kind?: string | null
  external?: string | null
  internal?: {
    _type: string
    slug?: string | null
    brand?: string | null
    brands?: string[] | null
  } | null
}

function pathFor(slug: string, prefix = ''): string {
  return `${prefix}/${encodeURIComponent(slug)}`
}

/**
 * Turns a link field into an href for the brand being rendered.
 *
 * Content on another brand resolves to an absolute URL on that brand's origin,
 * because every query filters by the brand of the current host and a relative
 * path would 404. Returns null when the target has no route; callers then
 * render no link.
 */
export function resolveHref(
  link: ResolvableLink | null | undefined,
  currentBrand: BrandKey,
): string | null {
  if (!link) {
    return null
  }

  if (stegaClean(link.kind) === 'external') {
    return safeHref(link.external)
  }

  const target = link.internal
  const slug = stegaClean(target?.slug)

  if (!target || !slug) {
    return null
  }

  switch (target._type) {
    case 'page': {
      const brand = stegaClean(target.brand)

      if (!brand || !isBrandKey(brand)) {
        return null
      }

      const path = slug === HOME_PAGE_SLUG ? '/' : pathFor(slug)

      return brand === currentBrand ? path : `${brandOrigin(brand)}${path}`
    }
    case 'post': {
      const brands = (target.brands ?? []).map((brand) => stegaClean(brand))
      const path = pathFor(slug, '/posts')

      if (brands.includes(currentBrand)) {
        return path
      }

      const home = brands.find(isBrandKey)

      return home ? `${brandOrigin(home)}${path}` : null
    }
    // TODO: conferenceEvent and awardsProgramme live at /events/{slug}/ and resource at /resource/{slug}/
    // on clearviewpublishing.com. Resolve them here once those routes exist.
    default:
      return null
  }
}
