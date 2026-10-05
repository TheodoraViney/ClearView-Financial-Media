import type { SVGProps } from 'react'

export function CheckIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg width={12} height={12} viewBox="0 0 12 12" fill="none" {...props}>
      <path
        d="M10 3L4.5 8.5L2 6"
        stroke="currentColor"
        strokeWidth={2}
      />
    </svg>
  )
}
