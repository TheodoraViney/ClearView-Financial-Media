import type { SVGProps } from 'react'

// 2px outline glyph from the design's uploads (benefit-star-icon), drawn at 48px. Stats bar tiles.
export function StatStarIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg width={48} height={48} viewBox="0 0 48 48" fill="none" {...props}>
      <path
        d="M24 4C25.6907 14.2644 33.7356 22.3093 44 24C33.7356 25.6907 25.6907 33.7356 24 44C22.3093 33.7356 14.2644 25.6907 4 24C14.2644 22.3093 22.3093 14.2644 24 4Z"
        stroke="currentColor"
        strokeWidth={2}
      />
    </svg>
  )
}
