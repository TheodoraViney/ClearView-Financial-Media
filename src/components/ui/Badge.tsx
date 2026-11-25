import { type ReactNode } from 'react'

import { cx } from './cx'

const TONES = {
  // The grey tag of the shared-shell (`#F5F5F5`, dark text): status tags, speaker roles, award chips, card tags.
  neutral: 'bg-surface-thumb text-foreground',
  // White on white/14, on the dark awards programme masthead.
  masthead: 'bg-white/14 text-white',
}

const LAYOUTS = {
  // One line, 24px high.
  line: 'h-6 leading-none',
  // At least 24px: a long label wraps inside the tag (16px lines, 4px above and below) instead of running out of its box.
  wrap: 'min-h-6 max-w-full min-w-0 py-1 leading-4 wrap-anywhere',
}

/**
 * The 13px grey tag (shared-shell metadata-row status tag, company-card tag): radius 4, 8px sides. The caller adds
 * its own spacing and `whitespace-nowrap` where the tag must not wrap its words.
 */
export function Badge({
  as: Tag = 'span',
  tone = 'neutral',
  layout = 'line',
  className,
  children,
}: {
  as?: 'span' | 'p' | 'li'
  tone?: keyof typeof TONES
  layout?: keyof typeof LAYOUTS
  className?: string
  children: ReactNode
}) {
  return (
    <Tag className={cx('inline-flex items-center rounded-sm px-2 text-caption', LAYOUTS[layout], TONES[tone], className)}>
      {children}
    </Tag>
  )
}
