import { stegaClean, type StegaBranded } from 'next-sanity'

import type { BrandKey } from '@/brands'
import type { HeaderLink, HeaderLogo } from '@/components/sections/header/types'
import { resolveHref, type ResolvableLink } from '@/lib/links'
import type { SHELL_QUERY_RESULT } from '@/sanity/types'

// Shared by the site shell adapters (Header and Footer), which both read the one shell query.

/** The site shell query result: header, footer and brand logo. */
export type ShellData = StegaBranded<SHELL_QUERY_RESULT>

export type NavLinkData = { _key: string; label: string | null; link: ResolvableLink | null }

export function toLink(item: NavLinkData, brand: BrandKey): HeaderLink | null {
  // Cross-brand internal targets resolve to absolute URLs; a target with no route drops the item.
  const href = resolveHref(item.link, brand)

  return href && item.label ? { key: item._key, label: item.label, href } : null
}

export const isPresent = <T,>(value: T | null): value is T => value !== null

type ShellLogo = NonNullable<ShellData['brand']>['logo']

/**
 * A logo from Brand settings, used by header and footer: the header passes `logo`, the footer its own `footerLogo`
 * falling back to `logo`. Alt is the brand title.
 */
export function toLogo(logo: ShellLogo | undefined, brandTitle: string | null | undefined): HeaderLogo | null {
  const asset = logo?.asset
  const src = stegaClean(asset?.url)
  const dimensions = asset?.metadata?.dimensions

  if (!src || !dimensions?.width || !dimensions.height) {
    return null
  }

  // SVG logos are used as uploaded, so the asset URL goes out without image transforms.
  return {
    src,
    width: dimensions.width,
    height: dimensions.height,
    alt: stegaClean(brandTitle) ?? '',
  }
}
