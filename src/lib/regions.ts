/*
 * The region of an Awards edition or conference event on the shared listings page: the region on each row and the
 * Region filter. An edition takes the region of its awards programme (`awardsProgrammeGroup.region`), set by the team,
 * since the venue country cannot say Global or a market other than the venue's (Wealth For Good is held in London).
 * An edition without a programme, and every event, falls back to its `country` (ISO 3166-1 alpha-2 code). A country not
 * in the table has no region, so its record shows no region and only appears with the filter on All. Global is set on
 * programmes only and filters on its own. The region names are CMS copy on the record listing block
 * (src/lib/record-listing-copy.ts).
 * Pure: no Sanity or Next imports.
 */
import type { RecordListingCopyKey } from './record-listing-copy'

export const REGIONS = ['europe', 'mena', 'asia', 'northAmerica', 'global'] as const

export type Region = (typeof REGIONS)[number]

/** The Studio option titles of the programme's Region field. The site shows the CMS labels (REGION_LABELS). */
export const REGION_TITLES: Record<Region, string> = {
  europe: 'Europe',
  mena: 'MENA',
  asia: 'Asia',
  northAmerica: 'North America',
  global: 'Global',
}

const COUNTRIES: Record<Exclude<Region, 'global'>, readonly string[]> = {
  europe: [
    'AD', 'AT', 'BE', 'BG', 'CH', 'CY', 'CZ', 'DE', 'DK', 'EE', 'ES', 'FI', 'FR', 'GB', 'GG', 'GI', 'GR', 'HR', 'HU',
    'IE', 'IM', 'IS', 'IT', 'JE', 'LI', 'LT', 'LU', 'LV', 'MC', 'MT', 'NL', 'NO', 'PL', 'PT', 'RO', 'SE', 'SI', 'SK', 'SM',
  ],
  mena: ['AE', 'BH', 'DZ', 'EG', 'IL', 'IQ', 'JO', 'KW', 'LB', 'LY', 'MA', 'OM', 'QA', 'SA', 'TN', 'TR'],
  asia: ['CN', 'HK', 'ID', 'IN', 'JP', 'KR', 'MO', 'MY', 'PH', 'SG', 'TH', 'TW', 'VN'],
  northAmerica: ['BM', 'CA', 'KY', 'MX', 'US'],
}

const REGION_BY_COUNTRY = new Map<string, Region>(
  Object.entries(COUNTRIES).flatMap(([region, countries]) => countries.map((country) => [country, region as Region])),
)

const isRegion = (value: string | null | undefined): value is Region => (REGIONS as readonly string[]).includes(value ?? '')

/** The region of a record: its programme's region when set (editions only), else the region of its country. */
export function regionOf(country: string | null | undefined, programmeRegion?: string | null): Region | null {
  if (isRegion(programmeRegion)) {
    return programmeRegion
  }

  return (country && REGION_BY_COUNTRY.get(country)) || null
}

/** The CMS label of each region, on the record listing block. */
export const REGION_LABELS: Record<Region, RecordListingCopyKey> = {
  europe: 'regionEuropeLabel',
  mena: 'regionMenaLabel',
  asia: 'regionAsiaLabel',
  northAmerica: 'regionNorthAmericaLabel',
  global: 'regionGlobalLabel',
}
