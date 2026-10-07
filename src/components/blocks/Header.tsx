import { stegaClean, type StegaBranded } from 'next-sanity'

import type { BrandKey } from '@/brands'
import { GroupHeader } from '@/components/sections/header/GroupHeader'
import { PublicationHeader } from '@/components/sections/header/PublicationHeader'
import type { HeaderItem, HeaderLink, HeaderLogo } from '@/components/sections/header/types'
import { resolveHref, type ResolvableLink } from '@/lib/links'
import type { HEADER_QUERY_RESULT } from '@/sanity/types'

export type HeaderData = StegaBranded<HEADER_QUERY_RESULT>

type NavLinkData = { _key: string; label: string | null; link: ResolvableLink | null }

function toLink(item: NavLinkData, brand: BrandKey): HeaderLink | null {
  // Cross-brand internal targets resolve to absolute URLs; a target with no route drops the item.
  const href = resolveHref(item.link, brand)

  return href && item.label ? { key: item._key, label: item.label, href } : null
}

const isPresent = <T,>(value: T | null): value is T => value !== null

function toLogo(brand: HeaderData['brand']): HeaderLogo | null {
  const asset = brand?.logo?.asset
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
    alt: stegaClean(brand?.title) ?? '',
  }
}

/** Site header for the brand being rendered. The header document's type picks the layout. */
export function Header({ data, brand }: { data: HeaderData; brand: BrandKey }) {
  const { header } = data

  if (!header) {
    return null
  }

  const items: HeaderItem[] = (header.navigation ?? [])
    .map((item): HeaderItem | null => {
      if (item._type === 'navGroup') {
        const links = (item.links ?? []).map((link) => toLink(link, brand)).filter(isPresent)

        return links.length > 0 && item.label
          ? { kind: 'group', key: item._key, label: item.label, links }
          : null
      }

      const link = toLink(item, brand)

      return link ? { kind: 'link', ...link } : null
    })
    .filter(isPresent)

  const props = {
    logo: toLogo(data.brand),
    homeHref: '/',
    items,
    searchPlaceholder: header.searchPlaceholder ?? '',
  }

  if (stegaClean(header._type) === 'publicationHeader') {
    const subscribeHref = resolveHref(header.subscribe, brand)
    const subscribeLabel = header.subscribe?.label

    return (
      <PublicationHeader
        {...props}
        subscribe={subscribeHref && subscribeLabel ? { label: subscribeLabel, href: subscribeHref } : null}
      />
    )
  }

  return <GroupHeader {...props} />
}
