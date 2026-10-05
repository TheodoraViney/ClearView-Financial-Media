import type { SVGProps } from 'react'

export function MenuIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg width={20} height={20} viewBox="0 0 20 20" fill="none" {...props}>
      <path
        d="M3 6H17M3 10H17M3 14H17"
        stroke="currentColor"
        strokeWidth={1}
        strokeLinecap="round"
      />
    </svg>
  )
}
