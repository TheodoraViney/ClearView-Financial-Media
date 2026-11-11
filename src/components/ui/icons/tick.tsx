import type { SVGProps } from 'react'

// The `Dropdown` option tick: 12px beside a single choice, 10px (strokeWidth 1.5) inside a multi checkbox.
// The stroke width is inherited from the svg, so callers set it there.
export function TickIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg width={12} height={12} viewBox="0 0 12 12" fill="none" {...props}>
      <path
        d="M2.5 6.25L5 8.5L9.5 3.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
