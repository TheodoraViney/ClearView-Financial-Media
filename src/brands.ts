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
}

export const BRANDS: Record<BrandKey, BrandDefaults> = {
  wealthbriefing: {
    title: 'WealthBriefing',
    domain: 'wealthbriefing.com',
    region: 'uk',
    brandColor: '#0B3C5D',
  },
  wealthbriefingasia: {
    title: 'WealthBriefingAsia',
    domain: 'wealthbriefingasia.com',
    region: 'asia',
    brandColor: '#B5121B',
  },
  familywealthreport: {
    title: 'Family Wealth Report',
    domain: 'familywealthreport.com',
    region: 'us',
    brandColor: '#1F6F43',
  },
  clearview: {
    title: 'ClearView Financial Media',
    domain: 'clearviewpublishing.com',
    region: 'global',
    brandColor: '#222222',
  },
}

export function resolveBrandFromHost(host: string): BrandKey | null {
  const withoutPort = host.split(':')[0].toLowerCase()
  const withoutWww = withoutPort.startsWith('www.')
    ? withoutPort.slice(4)
    : withoutPort

  for (const key of BRAND_KEYS) {
    if (withoutWww === BRANDS[key].domain || withoutWww === `${key}.localhost`) {
      return key
    }
  }

  return null
}
