import type { SVGProps } from 'react'

// The 12px arrow of a custom `Dropdown` trigger (shared-shell select-dropdown).
export function DropdownChevronIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg width={12} height={12} viewBox="0 0 12 12" fill="none" {...props}>
      <path
        d="M3 4.5L6 7.5L9 4.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
