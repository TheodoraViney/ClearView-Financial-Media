import type { SVGProps } from 'react'

// 2px outline glyph from the design's uploads (benefit-globe-icon), drawn at 48px. Stats bar tiles.
export function StatGlobeIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg width={48} height={48} viewBox="0 0 48 48" fill="none" {...props}>
      <path
        d="M24 4C35.0457 4 44 12.9543 44 24M24 4C12.9543 4 4 12.9543 4 24M24 4C29.5228 4 34 12.9543 34 24C34 35.0457 29.5228 44 24 44M24 4C18.4772 4 14 12.9543 14 24C14 35.0457 18.4772 44 24 44M44 24C44 35.0457 35.0457 44 24 44M44 24H4M24 44C12.9543 44 4 35.0457 4 24"
        stroke="currentColor"
        strokeWidth={2}
      />
    </svg>
  )
}
