import type { SVGProps } from 'react'

// The small form checkbox tick (`Checkbox size="sm"`).
export function CheckSmIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg width={10} height={8} viewBox="0 0 10 8" fill="none" {...props}>
      <path
        d="M1 4L3.8 6.5L9 1"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
