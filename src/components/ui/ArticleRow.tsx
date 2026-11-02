import Link from 'next/link'
import { type ReactNode } from 'react'

import { cx } from './cx'
import { Icon } from './Icon'
import { Media, type MediaImage } from './Media'
import { Meta } from './Meta'

// Square thumb, so a landscape image is cropped at the sides: 80 high at most below lg × 16/9 ≈ 142 → 144px;
// 36 from lg (`lg:size-9`) × 16/9 = 64 → 64px.
const THUMB_SIZES = '(min-width: 64rem) 64px, 144px'

// `card`: 36px square thumb on every breakpoint, 36 × 16/9 = 64 → 64px.
const CARD_THUMB_SIZES = '64px'

// `responsive` (the default): divided list row below lg, bordered card from lg (ClearView Top stories).
// `card`: the bordered card on every breakpoint with a static chevron and a 180ms ease-out hover (publication homes).
const VARIANTS = {
  responsive: {
    root: 'items-center border-b border-border py-4 lg:min-h-23.5 lg:items-start lg:rounded-sm lg:border lg:p-4',
    hover: 'duration-180 ease-smooth',
    thumb: 'lg:size-9',
    body: 'gap-3 lg:self-stretch lg:justify-center',
    title: 'leading-title lg:line-clamp-2',
    inlineChevron: 'hidden lg:flex',
    chevronMotion: 'transition-transform duration-180 ease-smooth group-hover:translate-x-0.75',
    trailingChevron: 'lg:hidden',
  },
  card: {
    // 94 high and 11 between the title and the meta, as the publication design's card.
    root: 'h-23.5 items-start rounded-sm border border-border p-4',
    hover: 'duration-180 ease-out',
    thumb: 'size-9',
    body: 'gap-2.75 self-stretch',
    // 16/19.2 as the publication design's card (94 high with two lines).
    title: 'leading-heading line-clamp-2',
    inlineChevron: 'flex',
    chevronMotion: '',
    trailingChevron: '',
  },
}

// Horizontal story row. Mobile and tablet: divided list row; desktop: bordered card (`variant="card"`: card everywhere).
// The parent list supplies the top border on mobile/tablet and the grid on desktop.
export function ArticleRow({
  href,
  title,
  meta,
  image,
  variant = 'responsive',
  className,
}: {
  // Without href the row renders as plain content, with no hover state or chevrons.
  href?: string | null
  title: string
  meta: ReactNode[]
  image?: MediaImage | null
  variant?: keyof typeof VARIANTS
  className?: string
}) {
  const styles = VARIANTS[variant]
  const classes = cx(
    'flex gap-4',
    styles.root,
    href && cx('group transition-colors hover:bg-surface-hover', styles.hover),
    className,
  )

  const content = (
    <>
      <Media
        image={image}
        sizes={variant === 'card' ? CARD_THUMB_SIZES : THUMB_SIZES}
        thumb={variant === 'card' ? 'xs' : 'md'}
        className={variant === 'card' ? undefined : styles.thumb}
      />
      <div className={cx('flex min-w-0 flex-1 flex-col', styles.body)}>
        <div className="flex gap-2">
          <span className={cx('min-w-0 flex-1 text-base font-medium text-pretty text-foreground', styles.title)}>
            {title}
          </span>
          {href && (
            <span className={cx('h-4.5 items-center', styles.inlineChevron)}>
              <Icon name="chevron-right" className={styles.chevronMotion || undefined} />
            </span>
          )}
        </div>
        {/* The card keeps its meta on one line (design: nowrap); a long category is cut with an ellipsis. */}
        <Meta items={meta} nowrap={variant === 'card'} className={variant === 'card' ? 'leading-none' : undefined} />
      </div>
      {href && styles.trailingChevron && (
        <span className={cx('flex size-6 items-center justify-center text-foreground', styles.trailingChevron)}>
          <Icon name="chevron-right" />
        </span>
      )}
    </>
  )

  if (!href) {
    return <div className={classes}>{content}</div>
  }

  return (
    <Link href={href} className={classes}>
      {content}
    </Link>
  )
}
