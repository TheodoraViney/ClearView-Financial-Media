import Link from 'next/link'

import { ArrowLink } from '@/components/ui/ArrowLink'
import { cx } from '@/components/ui/cx'
import { Media, type MediaImage } from '@/components/ui/Media'
import type { ShellVariant } from '@/components/ui/motion'

export type SponsoredContentProps = {
  /** `group` (ClearView, the default) or `publication` (WealthBriefing home). */
  look?: ShellVariant
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

// Publication home (WB v2.0): the side-by-side card from md (tablet "as desktop"), one column below; the page padding
// of the top part; after Top stories 40 on every breakpoint, then the lead stories' bottom padding (48 / 64 / 80 from 1200).
const LOOKS = {
  group: {
    section: 'px-gutter py-section after-top-stories:pt-7 md:after-top-stories:pt-10',
    card: 'lg:grid-cols-sponsored lg:gap-8',
    image: 'aspect-16/10 w-full lg:aspect-auto lg:h-33 lg:w-50',
    imageSizes: IMAGE_SIZES,
    partner: 'lg:flex-col lg:items-stretch lg:border-t-0 lg:border-l lg:pt-0 lg:pr-2 lg:pl-8',
    logo: 'lg:w-full',
    logoSizes: LOGO_SIZES,
    profile: 'max-lg:self-center lg:mt-auto lg:ml-0',
    partnerName: 'text-caption leading-none',
  },
  publication: {
    section: 'px-side py-12 after-top-stories:pt-10 md:py-16 header:py-20',
    card: 'md:grid-cols-sponsored md:gap-8',
    image: 'aspect-16/10 w-full md:aspect-auto md:h-33 md:w-50',
    imageSizes: '(min-width: 48rem) 240px, 95vw',
    partner: 'md:flex-col md:items-stretch md:border-t-0 md:border-l md:pt-0 md:pr-2 md:pl-8',
    logo: 'md:w-full',
    logoSizes: '(min-width: 48rem) 160px, 120px',
    profile: 'max-md:self-center md:mt-auto md:ml-0',
    // 12/16 as the WB design.
    partnerName: 'text-xs',
  },
}

/**
 * Home "Sponsored content": a label with an "all sponsored articles" link, then one sponsored post as a card with
 * its sponsor's name, logo and company profile link. Compact (one column, partner row at the bottom) below lg;
 * from lg image, body and partner column side by side.
 * Placed right after Top stories it continues that section (see the after-top-stories variant in globals.css).
 */
export function SponsoredContent({ look = 'group', label, link, post, sponsor }: SponsoredContentProps) {
  const styles = LOOKS[look]

  return (
    <section aria-label={label} data-block="sponsored-content" className={cx('flex flex-col gap-4', styles.section)}>
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        {/* The section heading, so the post title (h3) sits under an h2. */}
        <h2 className="text-caption leading-none font-medium text-grey">{label}</h2>
        {link && (
          <ArrowLink href={link.href} variant="accent" hover="fade">
            {link.label}
          </ArrowLink>
        )}
      </div>

      <article className={cx('grid gap-4 rounded-sm border border-border bg-surface-subtle p-6', styles.card)}>
        {/* Duplicates the title link: out of the tab order and hidden from assistive tech, the title link names the post. */}
        <Link href={post.href} tabIndex={-1} aria-hidden="true" className="group block self-start rounded-sm">
          <Media
            image={post.image}
            sizes={styles.imageSizes}
            zoom="slow"
            className={styles.image}
          />
        </Link>

        <div className="flex min-w-0 flex-col justify-center gap-3">
          <span className={cx('font-medium text-accent', styles.partnerName)}>{sponsor.name}</span>
          <h3 className="text-title-lg font-medium text-pretty text-foreground">
            <Link href={post.href} className="transition-colors duration-180 ease-out hover:text-accent">
              {post.title}
            </Link>
          </h3>
          {post.excerpt && <p className="text-base leading-copy text-pretty text-grey">{post.excerpt}</p>}
        </div>

        {(sponsor.logo || sponsor.profile) && (
          <div className={cx('flex items-center justify-between gap-4 border-t border-border pt-4', styles.partner)}>
            {sponsor.logo && (
              <Media image={sponsor.logo} sizes={styles.logoSizes} fit="contain" className={cx('aspect-5/2 w-30 max-w-full', styles.logo)} />
            )}
            {/* Right-aligned in the row below lg and at the bottom of the column from lg, with or without a logo. */}
            {sponsor.profile && (
              <ArrowLink href={sponsor.profile.href} variant="accent" hover="fade" className={cx('ml-auto', styles.profile)}>
                {sponsor.profile.label}
              </ArrowLink>
            )}
          </div>
        )}
      </article>
    </section>
  )
}
