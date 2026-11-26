/*
 * The region of an Awards edition or conference event on the shared listings page: the region on each row and the
 * Region filter. The regions are `eventRegion` documents, edited in the Studio under Event regions: the name shown on
 * the site is the document title, the URL value its slug.
 *
 * An edition takes the region of its awards programme (`awardsProgrammeGroup.region`), set by the team, since the
 * venue country cannot say Global or a market other than the venue's (Wealth For Good is held in London). An edition
 * without a programme region, and every event, falls back to the region of its `country` (ISO 3166-1 alpha-2 code)
 * from COUNTRY_REGIONS below, which names regions by slug. A country not in the table, or one whose region document is
 * missing, has no region: its record shows none and only appears with the filter on All.
 * Pure: no Sanity or Next imports.
 */

/** An `eventRegion` document as the listing reads it. */
export type EventRegion = { slug: string; title: string }

/** The document id of a seeded region: `eventRegion-{slug}`. No dot, so the public API can read it. */
export const eventRegionDocumentId = (slug: string): string => `eventRegion-${slug}`

/** The countries of each region, by region slug. Global has none: it is set on programmes only. */
const COUNTRY_REGIONS: Record<string, readonly string[]> = {
  europe: [
    'AD', 'AT', 'BE', 'BG', 'CH', 'CY', 'CZ', 'DE', 'DK', 'EE', 'ES', 'FI', 'FR', 'GB', 'GG', 'GI', 'GR', 'HR', 'HU',
    'IE', 'IM', 'IS', 'IT', 'JE', 'LI', 'LT', 'LU', 'LV', 'MC', 'MT', 'NL', 'NO', 'PL', 'PT', 'RO', 'SE', 'SI', 'SK', 'SM',
  ],
  mena: ['AE', 'BH', 'DZ', 'EG', 'IL', 'IQ', 'JO', 'KW', 'LB', 'LY', 'MA', 'OM', 'QA', 'SA', 'TN', 'TR'],
  asia: ['CN', 'HK', 'ID', 'IN', 'JP', 'KR', 'MO', 'MY', 'PH', 'SG', 'TH', 'TW', 'VN'],
  'north-america': ['BM', 'CA', 'KY', 'MX', 'US'],
}

const REGION_BY_COUNTRY = new Map<string, string>(
  Object.entries(COUNTRY_REGIONS).flatMap(([slug, countries]) => countries.map((country) => [country, slug])),
)

/** Resolves a record's region slug: its programme's region when set (editions only), else the region of its country. */
export function regionResolver(regions: readonly EventRegion[]) {
  const slugs = new Set(regions.map((region) => region.slug))

  return (country: string | null | undefined, programmeRegion?: string | null): string | null => {
    if (programmeRegion && slugs.has(programmeRegion)) {
      return programmeRegion
    }

    const slug = country && REGION_BY_COUNTRY.get(country)

    return slug && slugs.has(slug) ? slug : null
  }
}
