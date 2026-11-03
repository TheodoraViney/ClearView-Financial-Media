import { stegaClean } from 'next-sanity'

import type { BrandKey } from '@/brands'
import { GroupHeader } from '@/components/sections/header/GroupHeader'
import { PublicationHeader } from '@/components/sections/header/PublicationHeader'
import type { HeaderItem } from '@/components/sections/header/types'
import { SEARCH_LABEL_DEFAULTS } from '@/lib/search-term'
import { brandTitle } from '@/sanity/brand-title'

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

  const labels = header.searchLabels
  const props = {
    logo: toLogo(data.brand?.logo, brandTitle(brand, data.brand?.title)),
    homeHref: '/',
    items,
    searchPlaceholder: header.searchPlaceholder ?? '',
    searchLabels: {
      posts: labels?.articles ?? SEARCH_LABEL_DEFAULTS.articles,
      events: labels?.events ?? SEARCH_LABEL_DEFAULTS.events,
      awards: labels?.awards ?? SEARCH_LABEL_DEFAULTS.awards,
      resources: labels?.resources ?? SEARCH_LABEL_DEFAULTS.resources,
      empty: labels?.nothingFound ?? SEARCH_LABEL_DEFAULTS.nothingFound,
    },
  }

  if (stegaClean(header._type) === 'publicationHeader') {
    // The old link's label until every header has the new label field. Without the brand's pop-up document there is
    // nothing to open, so no Subscribe button.
    const subscribeLabel = data.subscribeModal
      ? [header.subscribeLabel, header.subscribe?.label].find((label) => stegaClean(label)?.trim())
      : undefined

    return <PublicationHeader {...props} subscribe={subscribeLabel ? { label: subscribeLabel } : null} />
  }

  return <GroupHeader {...props} />
}
