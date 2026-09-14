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

export function isBrandKey(value: string): value is BrandKey {
  return (BRAND_KEYS as readonly string[]).includes(value)
}

interface BrandDefaults {
  title: string
  domain: string
  region: 'uk' | 'asia' | 'us' | 'global'
  brandColor: string
  stagingHost: string
}

export const BRANDS: Record<BrandKey, BrandDefaults> = {
  wealthbriefing: {
    title: 'WealthBriefing',
    domain: 'wealthbriefing.com',
    region: 'uk',
    brandColor: '#0B3C5D',
    stagingHost: 'wealthbriefing-staging.vercel.app',
  },
  wealthbriefingasia: {
    title: 'WealthBriefingAsia',
    domain: 'wealthbriefingasia.com',
    region: 'asia',
    brandColor: '#B5121B',
    stagingHost: 'wealthbriefingasia-staging.vercel.app',
  },
  familywealthreport: {
    title: 'Family Wealth Report',
    domain: 'familywealthreport.com',
    region: 'us',
    brandColor: '#1F6F43',
    stagingHost: 'familywealthreport-staging.vercel.app',
  },
  clearview: {
    title: 'ClearView Financial Media',
    domain: 'clearviewpublishing.com',
    region: 'global',
    brandColor: '#222222',
    stagingHost: 'clearview-staging.vercel.app',
  },
}

export const EXTRA_HOSTS: Record<string, BrandKey> = {
  'clear-view-financial-media.vercel.app': 'clearview',
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

  return HOST_TO_BRAND[withoutWww] ?? EXTRA_HOSTS[withoutWww] ?? null
}
