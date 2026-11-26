/*
 * The region of an Awards edition or conference event on the shared listings page: the region on each row and the
 * Region filter. The regions are `eventRegion` documents, edited in the Studio under Event regions: the name shown on
 * the site is the document title, the URL value its slug, and the countries it holds are on the document.
 *
 * An edition takes the region of its awards programme (`awardsProgrammeGroup.region`), set by the team, since the
 * venue country cannot say Global or a market other than the venue's (Wealth For Good is held in London). An edition
 * without a programme region, and every event, falls back to the region listing its `country` (ISO 3166-1 alpha-2
 * code). A country no region lists has no region, so its record shows none and only appears with the filter on All. A
 * region with no countries (Global) is reached through programmes only.
 * Pure: no Sanity or Next imports.
 */

/** An `eventRegion` document as the listing reads it. */
export type EventRegion = { slug: string; title: string; countries: readonly string[] }

/** The document id of a seeded region: `eventRegion-{key}`. No dot, so the public API can read it. */
export const eventRegionDocumentId = (key: string): string => `eventRegion-${key}`

/** Resolves a record's region slug: its programme's region when set (editions only), else the region of its country. */
export function regionResolver(regions: readonly EventRegion[]) {
  const slugs = new Set(regions.map((region) => region.slug))
  const byCountry = new Map<string, string>()

  for (const region of regions) {
    for (const country of region.countries) {
      // The Studio keeps a country in one region; should two still list it, the first one wins.
      if (!byCountry.has(country)) byCountry.set(country, region.slug)
    }
  }

  return (country: string | null | undefined, programmeRegion?: string | null): string | null => {
    if (programmeRegion && slugs.has(programmeRegion)) {
      return programmeRegion
    }

    return (country && byCountry.get(country)) || null
  }
}
