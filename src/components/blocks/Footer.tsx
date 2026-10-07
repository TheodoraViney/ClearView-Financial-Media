import { stegaClean } from 'next-sanity'

import type { BrandKey } from '@/brands'
import { GroupFooter } from '@/components/sections/footer/GroupFooter'
import { PublicationFooter } from '@/components/sections/footer/PublicationFooter'
import type {
  FooterColumn,
  FooterProps,
  FooterSocialLink,
  SocialPlatform,
} from '@/components/sections/footer/types'
import { safeHref } from '@/lib/links'
import { cachedUkToday } from '@/sanity/live'

import { isPresent, toLink, toLogo, type ShellData } from './shell'

const SOCIAL_PLATFORMS: readonly SocialPlatform[] = ['youtube', 'linkedin', 'x']

const isSocialPlatform = (value: string | null | undefined): value is SocialPlatform =>
  SOCIAL_PLATFORMS.includes(value as SocialPlatform)

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
      const platform = stegaClean(item.platform)
      const href = safeHref(item.url)

      return isSocialPlatform(platform) && href ? { key: item._key, platform, href } : null
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
