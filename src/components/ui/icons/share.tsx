import type { SVGProps } from 'react'

export function ShareIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg width={16} height={16} viewBox="0 0 16 16" fill="none" {...props}>
      <path
        d="M8 10V2.5M8 2.5L5 5.5M8 2.5L11 5.5M3 9V13H13V9"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
