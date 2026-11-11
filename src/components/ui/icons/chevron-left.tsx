import type { SVGProps } from 'react'

// Mirror of chevron-right (pagination Previous).
export function ChevronLeftIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg width={7} height={12} viewBox="0 0 7 12" fill="none" {...props}>
      <path
        d="M5 10L2 7L5 4"
        stroke="currentColor"
        strokeWidth={1}
        strokeLinecap="round"
      />
    </svg>
  )
}
