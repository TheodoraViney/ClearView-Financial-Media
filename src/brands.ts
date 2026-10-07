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

export const brandDocumentId = (key: BrandKey): string => `brand-${key}`

/** Id of a brand's header document. One per brand, so each brand's menu can differ. */
export const headerDocumentId = (key: BrandKey): string => `header-${key}`

/** ClearView has the group header; the editorial brands each have a publication header. */
export type HeaderType = 'clearviewHeader' | 'publicationHeader'

export function isBrandKey(value: string): value is BrandKey {
  return (BRAND_KEYS as readonly string[]).includes(value)
}

interface BrandDefaults {
  title: string
  domain: string
  region: 'uk' | 'asia' | 'us' | 'global'
  brandColor: string
  stagingHost: string
  /** Schema type of this brand's header document. */
  headerType: HeaderType
}

export const BRANDS: Record<BrandKey, BrandDefaults> = {
  wealthbriefing: {
    title: 'WealthBriefing',
    domain: 'wealthbriefing.com',
    region: 'uk',
    brandColor: '#0B3C5D',
    stagingHost: 'wealthbriefing.vercel.app',
    headerType: 'publicationHeader',
  },
  wealthbriefingasia: {
    title: 'WealthBriefingAsia',
    domain: 'wealthbriefingasia.com',
    region: 'asia',
    brandColor: '#B5121B',
    stagingHost: 'wealthbriefingasia.vercel.app',
    headerType: 'publicationHeader',
  },
  familywealthreport: {
    title: 'Family Wealth Report',
    domain: 'familywealthreport.com',
    region: 'us',
    brandColor: '#1F6F43',
    stagingHost: 'familywealthreport.vercel.app',
    headerType: 'publicationHeader',
  },
  clearview: {
    title: 'ClearView Financial Media',
    domain: 'clearviewpublishing.com',
    region: 'global',
    brandColor: '#222222',
    stagingHost: 'clear-view-financial-media.vercel.app',
    headerType: 'clearviewHeader',
  },
}

/**
 * Origin a brand is served from in the current environment, from
 * `NEXT_PUBLIC_SITE_ENV`: the live apex on `production` (with the `www` the
 * apex redirects to), the Vercel staging host on `staging`, and
 * `{key}.localhost:3000` in development, over https when
 * `NEXT_PUBLIC_DEV_HTTPS=true`.
 */
export function brandOrigin(key: BrandKey): string {
  if (process.env.NEXT_PUBLIC_SITE_ENV === 'production') {
    return `https://www.${BRANDS[key].domain}`
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
