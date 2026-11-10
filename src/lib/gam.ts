/**
 * Google Ad Manager: the banner positions the page templates render, their creative sizes, and the unit codes each
 * brand sets for them in Brand settings → Advertising. Shared by the Studio (fields, validation) and the site.
 */

/** Which unit set a page takes: the brand's home page, or every other page (articles, listings, records). */
export type AdPageType = 'home' | 'other'

export const AD_PAGE_TYPE_TITLES = {
  home: 'Home page unit',
  other: 'Other pages unit',
} as const satisfies Record<AdPageType, string>

/**
 * The fixed positions, in the order Brand settings lists them. Where each one sits is fixed by the page templates;
 * `pages` is where it can appear, so Brand settings asks only for those units. Sizes are the design's.
 */
export const AD_POSITIONS = {
  top: { title: 'Top banner', width: 728, height: 90, pages: ['home', 'other'] },
  side: { title: 'Side banner', width: 300, height: 250, pages: ['home', 'other'] },
  publications: { title: 'Banner after Publications', width: 728, height: 90, pages: ['home', 'other'] },
  article: { title: 'Article banner', width: 728, height: 90, pages: ['other'] },
  banner3: { title: 'Banner 3', width: 728, height: 90, pages: ['home'] },
  banner4: { title: 'Banner 4', width: 728, height: 90, pages: ['home'] },
  awardsWinners: { title: 'Awards Winners MPU', width: 300, height: 250, pages: ['home', 'other'] },
} as const satisfies Record<string, { title: string; width: number; height: number; pages: readonly AdPageType[] }>

export type AdPosition = keyof typeof AD_POSITIONS

export const AD_POSITION_KEYS = Object.keys(AD_POSITIONS) as AdPosition[]

/** Whether a position appears on a page type, so its unit field exists. */
export function positionShowsOn(position: AdPosition, page: AdPageType): boolean {
  return (AD_POSITIONS[position].pages as readonly AdPageType[]).includes(page)
}

/** The editor-only placeholder text of an empty position, e.g. "Top banner (728×90)". */
export function adPositionLabel(position: AdPosition): string {
  const { title, width, height } = AD_POSITIONS[position]

  return `${title} (${width}×${height})`
}

/**
 * What GAM accepts in an ad unit code, minus the characters we never need. The code becomes part of the ad request
 * path, so nothing else gets through.
 */
const AD_UNIT_CODE = /^[A-Za-z0-9_.-]+$/

export function isAdUnitCode(value: unknown): value is string {
  return typeof value === 'string' && AD_UNIT_CODE.test(value)
}

/**
 * The Publisher's Google Ad Manager network code. Unset means no ads anywhere: the slots stay empty reserved boxes,
 * which is how staging runs until the Publisher wants test impressions on their inventory.
 */
const networkCode = process.env.NEXT_PUBLIC_GAM_NETWORK_CODE?.trim()

export const GAM_NETWORK_CODE = networkCode && /^\d+$/.test(networkCode) ? networkCode : null

/** The ad request path of a unit in the Publisher's network. */
export function adUnitPath(code: string): string {
  return `/${GAM_NETWORK_CODE}/${code}`
}

/** The unit a position shows: its GAM code and the position's creative size. */
export type AdUnitView = { code: string; width: number; height: number }

/** Every position's unit on one page; null hides the position on the live site. */
export type AdUnits = Record<AdPosition, AdUnitView | null>

/** Brand settings → Advertising as stored: one object per position, one code per page type. */
export type AdvertisingValue =
  | Partial<Record<AdPosition, Partial<Record<AdPageType, string | null>> | null>>
  | null
  | undefined

/**
 * The brand's units for a page type. A position that does not appear on that page type, or whose code is empty or
 * not usable, gets null. Takes stega-clean values: the code becomes part of the ad request path, and the Studio rule
 * is not a guard.
 */
export function toAdUnits(advertising: AdvertisingValue, page: AdPageType): AdUnits {
  return Object.fromEntries(
    AD_POSITION_KEYS.map((position) => {
      const code = positionShowsOn(position, page) ? advertising?.[position]?.[page] : null
      const { width, height } = AD_POSITIONS[position]

      return [position, isAdUnitCode(code) ? { code, width, height } : null]
    }),
  ) as AdUnits
}
