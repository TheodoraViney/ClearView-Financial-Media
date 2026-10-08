import Link from 'next/link'
import type { CSSProperties } from 'react'

import { cx } from '@/components/ui/cx'
import { FOOTER_EASE, type ShellVariant } from '@/components/ui/motion'

import type { FooterColumn, FooterSocialLink } from './types'

// Per-breakpoint values from the shared-shell footer masters (mobile, md = tablet, header = desktop from 1200).
const STYLES: Record<
  ShellVariant,
  { nav: string; column: string; title: string; link: string; follow: string; socialRow: string; social: string }
> = {
  // clearview-footer: auto-fit columns on desktop; links lose their min height and gain air (gap 12, line height 1.5).
  group: {
    nav: 'grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 md:gap-x-6 header:ml-auto header:min-w-70 header:shrink header:basis-157 header:grid-cols-footer header:gap-6',
    column: 'flex min-w-0 flex-col items-start md:gap-1 header:gap-3',
    title: 'pb-1 text-sm leading-copy font-medium text-foreground header:pb-0',
    link: 'flex min-h-11 items-center text-sm leading-copy text-grey transition-colors hover:text-foreground md:min-h-8 header:min-h-0 header:leading-normal',
    follow: 'col-span-full flex flex-col items-start gap-2 md:col-auto header:gap-3',
    socialRow: '-ml-2.5 flex gap-1 header:ml-0 header:gap-2',
    social: 'size-11 header:size-6',
  },
  // wb-g / wba / family-wealth-report footers: five equal columns on desktop, Follow us full width below it.
  publication: {
    nav: 'grid min-w-0 flex-auto grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-4 md:gap-x-6 header:grid-cols-5 header:gap-8',
    column: 'flex min-w-0 flex-col items-start md:gap-1',
    title: 'pb-1 text-sm leading-copy font-medium text-foreground',
    link: 'flex min-h-11 items-center text-sm leading-copy text-grey transition-colors hover:text-accent md:min-h-9 header:min-h-8',
    follow: 'col-span-full flex flex-col items-start gap-2 header:col-auto',
    socialRow: '-ml-2.5 flex flex-wrap gap-1',
    social: 'size-11',
  },
}

// Group footer scroll reveal, as the clearview-footer desktop master: columns 1–5 and Follow us 6, from the
// `header` breakpoint where that layout starts (the responsive design reveals only the brand block, GroupFooter). Publication footers do not reveal.
const COLUMN_REVEAL = [
  'scroll-reveal-none header:scroll-reveal-1',
  'scroll-reveal-none header:scroll-reveal-2',
  'scroll-reveal-none header:scroll-reveal-3',
  'scroll-reveal-none header:scroll-reveal-4',
  'scroll-reveal-none header:scroll-reveal-5',
]
const FOLLOW_REVEAL = 'scroll-reveal-none header:scroll-reveal-6'

/**
 * The footer's link columns and social group. As the design masters: each column is a plain
 * title over bare links (no headings, no lists), all inside one labelled nav.
 */
export function FooterNav({
  variant,
  columns,
  socialHeading,
  social,
}: {
  variant: ShellVariant
  columns: FooterColumn[]
  socialHeading: string
  social: FooterSocialLink[]
}) {
  const styles = STYLES[variant]
  const ease = FOOTER_EASE[variant]
  const reveal = variant === 'group'

  return (
    <nav aria-label="Footer" className={styles.nav}>
      {columns.map((column, index) => (
        <div
          key={column.key}
          data-reveal={reveal || undefined}
          className={cx(styles.column, reveal && COLUMN_REVEAL[index])}
        >
          <span className={styles.title}>{column.title}</span>
          {column.links.map((link) => (
            <Link key={link.key} href={link.href} className={cx(styles.link, ease)}>
              {link.label}
            </Link>
          ))}
        </div>
      ))}
      {social.length > 0 && (
        <div data-reveal={reveal || undefined} className={cx(styles.follow, reveal && FOLLOW_REVEAL)}>
          <span className="text-sm leading-copy font-medium text-foreground">{socialHeading}</span>
          <div className={styles.socialRow}>
            {social.map((item) => (
              <a
                key={item.key}
                href={item.href}
                aria-label={item.name}
                className={cx(
                  'flex shrink-0 items-center justify-center text-secondary transition-opacity hover:opacity-70',
                  styles.social,
                  ease,
                )}
              >
                {/* The uploaded icon is only a shape (mask-icon), filled with the brand's text-secondary. */}
                <span
                  aria-hidden="true"
                  className="block size-6 shrink-0 mask-icon"
                  style={{ '--icon': `url("${item.iconSrc}")` } as CSSProperties}
                />
              </a>
            ))}
          </div>
        </div>
      )}
    </nav>
  )
}
