import type { SVGProps } from 'react'

// 2px outline glyph from the design's uploads (benefit-article-icon), drawn at 48px. Stats bar tiles.
export function StatArticleIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg width={48} height={48} viewBox="0 0 48 48" fill="none" {...props}>
      <path
        d="M14 14H34M14 22H30M14 30H22M8 4H40V44H8V4Z"
        stroke="currentColor"
        strokeWidth={2}
      />
    </svg>
  )
}
