import type { SVGProps } from 'react'

// 2px outline glyph from the design's uploads (benefit-search-icon), drawn at 48px. Stats bar tiles.
export function StatSearchIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg width={48} height={48} viewBox="0 0 48 48" fill="none" {...props}>
      <path
        d="M42 42L35.0002 35M40 23C40 32.3888 32.3888 40 23 40C13.6112 40 6 32.3888 6 23C6 13.6112 13.6112 6 23 6C32.3888 6 40 13.6112 40 23Z"
        stroke="currentColor"
        strokeWidth={2}
      />
    </svg>
  )
}
