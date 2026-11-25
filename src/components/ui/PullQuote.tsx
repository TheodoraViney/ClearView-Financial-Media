import type { ReactNode } from 'react'

import { cx } from './cx'

// `default`: a quote between two rules, `text-quote` 26/32, with the curly quotation marks added here (article).
// `statement`: a top rule only, 20/24 at 500, no quotation marks, caption 13 grey (About "Team and publications").
// A `quote` that is not a string (rich text) goes in a box with the quote type, its paragraphs inheriting it.
const VARIANTS = {
  default: {
    box: 'gap-4 border-y py-8',
    quote: 'text-quote font-medium text-pretty',
    cite: 'text-caption leading-none text-grey not-italic',
    marks: true,
  },
  statement: {
    box: 'gap-3 border-t py-6',
    quote: 'pr-6 text-title-lg font-medium text-pretty',
    cite: 'text-caption leading-none text-grey not-italic',
    marks: false,
  },
}

export function PullQuote({
  quote,
  cite,
  variant = 'default',
  className,
}: {
  quote: ReactNode
  cite?: string | null
  variant?: keyof typeof VARIANTS
  className?: string
}) {
  const look = VARIANTS[variant]

  return (
    <blockquote className={cx('m-0 flex flex-col border-border', look.box, className)}>
      {typeof quote === 'string' ? (
        <p className={look.quote}>{look.marks ? `“${quote}”` : quote}</p>
      ) : (
        <div className={look.quote}>{quote}</div>
      )}
      {cite && <cite className={look.cite}>{cite}</cite>}
    </blockquote>
  )
}
