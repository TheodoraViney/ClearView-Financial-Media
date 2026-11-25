import type { SVGProps } from 'react'

// The 12 × 7 arrow of a disclosure summary (shared-shell table-of-contents, stacked).
export function DisclosureChevronIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg width={12} height={7} viewBox="0 0 12 7" fill="none" {...props}>
      <path d="M1 1L6 6L11 1" stroke="currentColor" strokeWidth={1.3} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
