import type { SVGProps } from 'react'

// The full-height 7 × 12 chevron of a whole-card link (shared-shell award-winner-card); `chevron-right` draws a smaller one.
export function CardChevronIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg width={7} height={12} viewBox="0 0 7 12" fill="none" {...props}>
      <path d="M1 1L6 6L1 11" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
