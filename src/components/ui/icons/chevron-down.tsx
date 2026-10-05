import type { SVGProps } from 'react'

export function ChevronDownIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg width={10} height={9} viewBox="0 0 10 9" fill="none" {...props}>
      <path
        d="M2 4L5 7L8 4"
        stroke="currentColor"
        strokeWidth={1}
        strokeLinecap="round"
      />
    </svg>
  )
}
