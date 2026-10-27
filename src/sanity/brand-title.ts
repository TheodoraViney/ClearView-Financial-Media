import { stegaClean } from 'next-sanity'

import { BRANDS, brandDocumentId, footerDocumentId, headerDocumentId, type BrandKey } from '@/brands'

import { cachedSanity, type DynamicFetchOptions } from './live'
import { SHELL_QUERY } from './queries'

/**
 * A brand's visitor-facing name: the title from its Brand settings, so a rename in Sanity reaches the site, else the
 * code constant in src/brands.ts. The Sanity value is returned as is, stega included, so visible text stays
 * click-to-edit; clean it where it goes into metadata or attributes.
 */
export function brandTitle(key: BrandKey, title: string | null | undefined): string {
  return title && stegaClean(title).trim() ? title : BRANDS[key].title
}

/** The `brandTitles` a projection returns next to a post's brands: one `{ key, title }` per Brand settings document. */
export type BrandTitles = { key: string | null; title: string | null }[] | null | undefined

/** The title of `key` from a `brandTitles` projection, else the code constant. Keys are cleaned before matching. */
export function brandTitleIn(titles: BrandTitles, key: BrandKey): string {
  return brandTitle(key, titles?.find((item) => stegaClean(item.key) === key)?.title)
}

/**
 * The site shell query (header, footer, Brand settings), through the same `cachedSanity` call as the brand layout,
 * so a page or metadata that also needs the brand title shares the layout's cache entry instead of adding a fetch.
 */
export function fetchShell(brand: BrandKey, { perspective, variant, stega }: DynamicFetchOptions) {
  return cachedSanity({
    query: SHELL_QUERY,
    params: {
      brand,
      headerId: headerDocumentId(brand),
      footerId: footerDocumentId(brand),
      brandId: brandDocumentId(brand),
    },
    perspective,
    variant,
    stega,
  })
}

/** The brand title from Brand settings via the shell query, else the code constant. */
export async function fetchBrandTitle(brand: BrandKey, options: DynamicFetchOptions): Promise<string> {
  const { data } = await fetchShell(brand, options)

  return brandTitle(brand, data.brand?.title)
}
