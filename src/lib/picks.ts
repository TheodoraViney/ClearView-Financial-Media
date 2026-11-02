/**
 * How a block combines its editor picks with the automatic fill. Pure, shared by the site adapters
 * (src/components/blocks) and the Studio "Shown automatically now" panel (src/sanity/auto-fill.ts), so both always
 * agree on which items fill the empty places.
 */

/** Picks pointing at unpublished or deleted documents dereference to null and are dropped. */
export const present = <T,>(items: (T | null | undefined)[] | null | undefined): T[] =>
  (items ?? []).filter((item): item is T => item !== null && item !== undefined)

/**
 * Picks first, then the fill for the empty places, up to `count`. The fill query already excludes the picks; the
 * dedupe guards the merge anyway (and drops a record that two fill tiers both returned).
 */
export function picksThenFill<T extends { _id: string }>(
  picks: (T | null | undefined)[] | null | undefined,
  fill: (T | null | undefined)[] | null | undefined,
  count: number,
): T[] {
  const picked = present(picks).slice(0, count)
  const seen = new Set(picked.map((item) => item._id))
  const rest = present(fill).filter((item) => {
    if (seen.has(item._id)) {
      return false
    }

    seen.add(item._id)

    return true
  })

  return [...picked, ...rest].slice(0, count)
}

/**
 * Top stories: lead stories (up to `slideMax`) and articles below (up to `articleCount`), each picks first; one
 * `latest` list fills the empty lead places first, then the articles with what follows.
 */
export function topStoriesSplit<T>(
  slides: (T | null | undefined)[] | null | undefined,
  articles: (T | null | undefined)[] | null | undefined,
  latest: (T | null | undefined)[] | null | undefined,
  slideMax: number,
  articleCount: number,
) {
  const fill = present(latest)
  const pickedSlides = present(slides).slice(0, slideMax)
  const fillSlides = fill.slice(0, slideMax - pickedSlides.length)
  const pickedArticles = present(articles).slice(0, articleCount)
  const fillArticles = fill.slice(fillSlides.length, fillSlides.length + articleCount - pickedArticles.length)

  return { pickedSlides, fillSlides, pickedArticles, fillArticles }
}

/** A block's optional count field: its value when a whole number from 1, capped at `max`; else `fallback`. */
export function countOr(value: unknown, fallback: number, max: number): number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 1 ? Math.min(value, max) : fallback
}
