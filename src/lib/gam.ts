/**
 * Google Ad Manager: the ad unit sizes the site serves and which banner position takes which.
 * Shared by the Studio (unit pickers, validation) and the site (slot definitions).
 */

/** Creative sizes an ad unit can carry, as GAM writes them. */
export const AD_UNIT_SIZES = ['728x90', '300x250'] as const

export type AdUnitSize = (typeof AD_UNIT_SIZES)[number]

export function isAdUnitSize(value: unknown): value is AdUnitSize {
  return typeof value === 'string' && (AD_UNIT_SIZES as readonly string[]).includes(value)
}

/**
 * The creative size each banner position serves. The position keeps its design size on every page, so only a unit
 * of this size fits it: the Studio offers no other.
 */
export const POSITION_UNIT_SIZE = {
  leaderboard: '728x90',
  billboard: '728x90',
  mpu: '300x250',
} as const satisfies Record<string, AdUnitSize>

export type AdPosition = keyof typeof POSITION_UNIT_SIZE

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

/** A unit picked for a banner position: its GAM code and creative size. */
export type AdUnitView = { code: string; width: number; height: number }

/**
 * The unit picked in the CMS, or null when none is picked or the value is not usable (the position is then hidden on
 * the live site). Takes stega-clean values: the code becomes part of the ad request path, and the Studio rule is not
 * a guard.
 */
export function toAdUnitView(unit: { code?: string | null; size?: string | null } | null | undefined): AdUnitView | null {
  if (!unit || !isAdUnitCode(unit.code) || !isAdUnitSize(unit.size)) {
    return null
  }

  const [width, height] = unit.size.split('x').map(Number)

  return { code: unit.code, width, height }
}
