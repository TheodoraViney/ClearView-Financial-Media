import type { SVGProps } from 'react'

export function ChevronRightIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg width={7} height={12} viewBox="0 0 7 12" fill="none" {...props}>
      <path
        d="M2 10L5 7L2 4"
        stroke="currentColor"
        strokeWidth={1}
        strokeLinecap="round"
      />
    </svg>
  )
}
