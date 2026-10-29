export const BRAND_KEYS = [
  'wealthbriefing',
  'wealthbriefingasia',
  'familywealthreport',
  'clearview',
] as const

export type BrandKey = (typeof BRAND_KEYS)[number]

export const EDITORIAL_BRAND_KEYS = BRAND_KEYS.filter(
  (key) => key !== 'clearview',
) as Exclude<BrandKey, 'clearview'>[]

export type EditorialBrandKey = (typeof EDITORIAL_BRAND_KEYS)[number]

export const brandDocumentId = (key: BrandKey): string => `brand-${key}`

/** Id of a brand's header document. One per brand, so each brand's menu can differ. */
export const headerDocumentId = (key: BrandKey): string => `header-${key}`

/** ClearView has the group header; the editorial brands each have a publication header. */
export type HeaderType = 'clearviewHeader' | 'publicationHeader'

/** Id of a brand's footer document. One per brand, so each brand's footer can differ. */
export const footerDocumentId = (key: BrandKey): string => `footer-${key}`

/** ClearView has the group footer; the editorial brands each have a publication footer. */
export type FooterType = 'clearviewFooter' | 'publicationFooter'

/** Id of an editorial brand's "Most read" list. ClearView carries no articles, so it has none. */
export const mostReadDocumentId = (key: EditorialBrandKey): string => `most-read-${key}`

/** Id of an editorial brand's "Article page" document: the article template's labels. */
export const articlePageDocumentId = (key: EditorialBrandKey): string => `article-page-${key}`

export function isBrandKey(value: string): value is BrandKey {
  return (BRAND_KEYS as readonly string[]).includes(value)
}

/** True for the three publications, which carry posts and send a newsletter; false for ClearView. */
export function isEditorialBrandKey(value: string): value is EditorialBrandKey {
  return (EDITORIAL_BRAND_KEYS as readonly string[]).includes(value)
}

/**
 * Brand colour tokens, as in the design. The single source for the site (inlined by the brand shell) and the
 * newsletter email; the Studio shows them read-only. Other colour tokens stay in globals.css.
 */
export interface BrandColors {
  accent: string
  accentHover: string
  accentSubtle: string
  focus: string
  surfaceHover: string
}

interface BrandDefaults {
  title: string
  domain: string
  region: 'uk' | 'asia' | 'us' | 'global'
  colors: BrandColors
  stagingHost: string
  /** Schema type of this brand's header document. */
  headerType: HeaderType
  /** Schema type of this brand's footer document. */
  footerType: FooterType
}

export const BRANDS: Record<BrandKey, BrandDefaults> = {
  wealthbriefing: {
    title: 'WealthBriefing',
    domain: 'wealthbriefing.com',
    region: 'uk',
    colors: {
      accent: '#174493',
      accentHover: '#10377D',
      accentSubtle: '#DCE6F6',
      focus: '#2860B5',
      surfaceHover: '#F6F9FE',
    },
    stagingHost: 'wealthbriefing.vercel.app',
    headerType: 'publicationHeader',
    footerType: 'publicationFooter',
  },
  wealthbriefingasia: {
    title: 'WealthBriefingAsia',
    domain: 'wealthbriefingasia.com',
    region: 'asia',
    colors: {
      accent: '#B41412',
      accentHover: '#8E100E',
      accentSubtle: '#F6DCDC',
      focus: '#C8302D',
      surfaceHover: '#FEF6F6',
    },
    stagingHost: 'wealthbriefingasia.vercel.app',
    headerType: 'publicationHeader',
    footerType: 'publicationFooter',
  },
  familywealthreport: {
    title: 'Family Wealth Report',
    domain: 'familywealthreport.com',
    region: 'us',
    colors: {
      accent: '#1B6B47',
      accentHover: '#14553A',
      accentSubtle: '#D6E8DD',
      focus: '#2A8A5A',
      surfaceHover: '#F3F8F5',
    },
    stagingHost: 'familywealthreport.vercel.app',
    headerType: 'publicationHeader',
    footerType: 'publicationFooter',
  },
  clearview: {
    title: 'ClearView Financial Media',
    domain: 'clearviewpublishing.com',
    region: 'global',
    colors: {
      accent: '#B41412',
      accentHover: '#9A1110',
      accentSubtle: '#E5E7EB',
      focus: '#1F2B32',
      surfaceHover: '#F7F7F7',
    },
    stagingHost: 'clear-view-financial-media.vercel.app',
    headerType: 'clearviewHeader',
    footerType: 'clearviewFooter',
  },
}

/** A brand's colours as the CSS custom properties the Tailwind colour tokens read (see globals.css). */
export function brandColorVars(colors: BrandColors): Record<string, string> {
  return {
    '--accent': colors.accent,
    '--accent-hover': colors.accentHover,
    '--accent-subtle': colors.accentSubtle,
    '--focus': colors.focus,
    '--surface-hover': colors.surfaceHover,
  }
}

/**
 * Origin a brand is served from in the current environment, from
 * `NEXT_PUBLIC_SITE_ENV`: the live apex on `production` (`www` redirects to
 * it, see docs/infrastructure.md), the Vercel staging host on `staging`, and
 * `{key}.localhost:3000` in development, over https when
 * `NEXT_PUBLIC_DEV_HTTPS=true`.
 */
export function brandOrigin(key: BrandKey): string {
  if (process.env.NEXT_PUBLIC_SITE_ENV === 'production') {
    return `https://${BRANDS[key].domain}`
  }

  if (process.env.NEXT_PUBLIC_SITE_ENV === 'staging') {
    return `https://${BRANDS[key].stagingHost}`
  }

  const protocol = process.env.NEXT_PUBLIC_DEV_HTTPS === 'true' ? 'https' : 'http'

  return `${protocol}://${key}.localhost:3000`
}

const HOST_TO_BRAND: Record<string, BrandKey> = {}

for (const key of BRAND_KEYS) {
  HOST_TO_BRAND[BRANDS[key].domain] = key
  HOST_TO_BRAND[`${key}.localhost`] = key
  HOST_TO_BRAND[BRANDS[key].stagingHost] = key
}

export function resolveBrandFromHost(host: string): BrandKey | null {
  const withoutPort = host.split(':')[0].toLowerCase()
  const withoutWww = withoutPort.startsWith('www.')
    ? withoutPort.slice(4)
    : withoutPort

  return HOST_TO_BRAND[withoutWww] ?? null
}

/**
 * Brand for a host that maps to no brand (Vercel preview URLs): the httpOnly `brand` cookie set by
 * /api/brand/{key}, else `DEFAULT_BRAND`, else null. Call it only after resolveBrandFromHost returned null,
 * so a production host can never be switched by a visitor. Shared by the proxy and the /api routes it skips.
 */
export function fallbackBrand(cookie: string | null | undefined): BrandKey | null {
  if (cookie && isBrandKey(cookie)) {
    return cookie
  }

  const fromEnv = process.env.DEFAULT_BRAND
  if (fromEnv && isBrandKey(fromEnv)) {
    return fromEnv
  }

  return null
}
