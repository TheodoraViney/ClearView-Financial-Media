import Link from 'next/link'

import { ArrowLink } from '@/components/ui/ArrowLink'
import { Media, type MediaImage } from '@/components/ui/Media'

export type SponsoredContentProps = {
  /** The label above the card, also the section's accessible name. */
  label: string
  link: { href: string; label: string } | null
  post: {
    href: string
    title: string
    excerpt: string | null
    image: MediaImage | null
  }
  sponsor: {
    name: string
    logo: MediaImage | null
    profile: { href: string; label: string } | null
  }
}

// Post image, cropped at the sides of a 16:9 image. Below lg the card width at 16:10 (≤ 85vw, 654 of 768):
// × (16/9) / (16/10) ≈ 1.11 → 95vw.
// From lg a 200 × 132 box: 132 × 16/9 ≈ 235 → 240px.
const IMAGE_SIZES = '(min-width: 64rem) 240px, 95vw'

// Sponsor logo, contained (no crop): 120px wide below lg, the 160px partner column (200 − 32 − 8 padding) from lg.
const LOGO_SIZES = '(min-width: 64rem) 160px, 120px'

/**
 * Home "Sponsored content": a label with an "all sponsored articles" link, then one sponsored post as a card with
 * its sponsor's name, logo and company profile link. Compact (one column, partner row at the bottom) below lg;
 * from lg image, body and partner column side by side.
 * Placed right after Top stories it continues that section (see the after-top-stories variant in globals.css).
 */
export function SponsoredContent({ label, link, post, sponsor }: SponsoredContentProps) {
  return (
    <section
      aria-label={label}
      data-block="sponsored-content"
      className="flex flex-col gap-4 px-gutter py-section after-top-stories:pt-7 md:after-top-stories:pt-10"
    >
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <span className="text-caption leading-none font-medium text-grey">{label}</span>
        {link && (
          <ArrowLink href={link.href} variant="accent" hover="fade">
            {link.label}
          </ArrowLink>
        )}
      </div>

      <article className="grid gap-4 rounded-sm border border-border bg-surface-subtle p-6 lg:grid-cols-sponsored lg:gap-8">
        {/* Named by the title: the image link goes where the headline goes. */}
        <Link href={post.href} aria-label={post.title} className="group block self-start rounded-sm">
          <Media
            image={post.image}
            sizes={IMAGE_SIZES}
            zoom="slow"
            className="aspect-16/10 w-full lg:aspect-auto lg:h-33 lg:w-50"
          />
        </Link>

        <div className="flex min-w-0 flex-col justify-center gap-3">
          <span className="text-caption leading-none font-medium text-accent">{sponsor.name}</span>
          <h3 className="text-title-lg font-medium text-pretty text-foreground">
            <Link href={post.href} className="transition-colors duration-180 ease-out hover:text-accent">
              {post.title}
            </Link>
          </h3>
          {post.excerpt && <p className="text-base leading-copy text-pretty text-grey">{post.excerpt}</p>}
        </div>

        {(sponsor.logo || sponsor.profile) && (
          <div className="flex items-center justify-between gap-4 border-t border-border pt-4 lg:flex-col lg:items-stretch lg:border-t-0 lg:border-l lg:pt-0 lg:pr-2 lg:pl-8">
            {sponsor.logo && (
              <Media image={sponsor.logo} sizes={LOGO_SIZES} fit="contain" className="aspect-5/2 w-30 max-w-full lg:w-full" />
            )}
            {/* Right-aligned in the row below lg and at the bottom of the column from lg, with or without a logo. */}
            {sponsor.profile && (
              <ArrowLink href={sponsor.profile.href} variant="accent" hover="fade" className="ml-auto max-lg:self-center lg:mt-auto lg:ml-0">
                {sponsor.profile.label}
              </ArrowLink>
            )}
          </div>
        )}
      </article>
    </section>
  )
}
