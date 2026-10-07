import { stegaClean } from 'next-sanity'

import type { BrandKey } from '@/brands'
import { GroupHeader } from '@/components/sections/header/GroupHeader'
import { PublicationHeader } from '@/components/sections/header/PublicationHeader'
import type { HeaderItem } from '@/components/sections/header/types'
import { resolveHref } from '@/lib/links'

import { isPresent, toLink, toLogo, type ShellData } from './shell'

/** Site header for the brand being rendered. The header document's type picks the layout. */
export function Header({ data, brand }: { data: ShellData; brand: BrandKey }) {
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
