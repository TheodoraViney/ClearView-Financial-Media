import type { SVGProps } from 'react'

// The 16px chevron of a full-width link row (shared-shell link-row).
export function RowChevronIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg width={16} height={16} viewBox="0 0 16 16" fill="none" {...props}>
      <path d="M6 12L10 8L6 4" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
