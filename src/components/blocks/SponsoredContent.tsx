import { stegaClean } from 'next-sanity'

import { isBrandKey } from '@/brands'
import { SponsoredContent as SponsoredContentSection } from '@/components/sections/SponsoredContent'
import { resolveHref, sharedRecordHref } from '@/lib/links'
import { toImage } from '@/sanity/image'

import type { BlockProps } from './types'

export function SponsoredContent({ block, brand }: BlockProps<'sponsoredContent'>) {
  const post = block.post
  const sponsor = post?.sponsor

  // The query drops a post that is unpublished, off this brand or no longer sponsored; nothing renders then.
  if (!post || !sponsor?.title) {
    return null
  }

  const brands = (post.brands ?? []).map((key) => stegaClean(key)).filter(isBrandKey)
  // Cross-brand posts link absolutely to their own brand's domain.
  const href = resolveHref({ kind: 'internal', internal: { _type: 'post', slug: post.slug, brands } }, brand)

  if (!href) {
    return null
  }

  const linkHref = resolveHref(block.link, brand)
  const linkLabel = block.link?.label
  // The final URL of the company profile, relative on ClearView and absolute elsewhere; no page is built yet, so it 404s until one is.
  const profileHref = sharedRecordHref('company', sponsor.slug, brand)
  const logo = toImage(sponsor.logo)

  return (
    <SponsoredContentSection
      label={block.label ?? ''}
      link={linkHref && linkLabel ? { href: linkHref, label: linkLabel } : null}
      post={{
        href,
        title: post.title ?? '',
        excerpt: post.excerpt ?? null,
        image: toImage(post.image),
      }}
      sponsor={{
        name: sponsor.title,
        // The logo's alt, else the media library's; the design's "{name} logo" when neither exists.
        logo: logo && { ...logo, alt: logo.alt || `${stegaClean(sponsor.title)} logo` },
        profile: profileHref && block.profileLabel ? { href: profileHref, label: block.profileLabel } : null,
      }}
    />
  )
}
