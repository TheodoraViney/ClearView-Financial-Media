import type { SVGProps } from 'react'

// 2px outline glyph from the About design's assets (bar-chart.svg), drawn at 48px. Coverage list items.
export function BarChartIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg width={48} height={48} viewBox="0 0 48 48" fill="none" {...props}>
      <path
        d="M6 22L6 42M30 22L30 42M18 6L18 42M42 6V42"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinejoin="round"
      />
    </svg>
  )
}
