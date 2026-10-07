import { stegaClean } from 'next-sanity'

import type { BrandKey } from '@/brands'
import { GroupFooter } from '@/components/sections/footer/GroupFooter'
import { PublicationFooter } from '@/components/sections/footer/PublicationFooter'
import type { FooterColumn, FooterProps, FooterSocialLink } from '@/components/sections/footer/types'
import { safeHref } from '@/lib/links'
import { cachedUkToday } from '@/sanity/live'

import { isPresent, toLink, toLogo, type ShellData } from './shell'

/** Site footer for the brand being rendered. The footer document's type picks the layout. */
export async function Footer({ data, brand }: { data: ShellData; brand: BrandKey }) {
  const { footer } = data

  if (!footer) {
    return null
  }

  // The UK year from the hourly cached date, so the copyright rolls over without a publish.
  const year = (await cachedUkToday()).slice(0, 4)

  const columns: FooterColumn[] = (footer.columns ?? [])
    .map((column): FooterColumn | null => {
      const links = (column.links ?? []).map((link) => toLink(link, brand)).filter(isPresent)

      return column.title && links.length > 0 ? { key: column._key, title: column.title, links } : null
    })
    .filter(isPresent)

  const social: FooterSocialLink[] = (footer.social ?? [])
    .map((item): FooterSocialLink | null => {
      // The name becomes the link's aria-label, so it must be free of stega characters.
      const name = stegaClean(item.name)?.trim()
      const href = safeHref(stegaClean(item.url))
      const iconSrc = stegaClean(item.icon?.asset?.url)

      return name && href && iconSrc ? { key: item._key, name, href, iconSrc } : null
    })
    .filter(isPresent)

  const props: FooterProps = {
    logo: toLogo(data.brand),
    description: footer.description ?? '',
    columns,
    socialHeading: footer.socialHeading ?? '',
    social,
    copyright: (footer.copyright ?? '').replaceAll('{year}', year),
  }

  if (stegaClean(footer._type) === 'publicationFooter') {
    return <PublicationFooter {...props} publisherLine={footer.publisherLine ?? ''} />
  }

  return <GroupFooter {...props} />
}
