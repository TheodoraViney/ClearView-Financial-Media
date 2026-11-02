import type { SVGProps } from 'react'

// Filled 32-unit glyph from the design's uploads (comment-icon), drawn at 32px. Explore "Comment & Analysis" (FWR).
export function CommentIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg width={32} height={32} viewBox="0 0 32 32" fill="none" {...props}>
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M28 4V24H16L9 28V24H4V4H28ZM11 16.5V17.5H21V16.5H11ZM11 10.5V11.5H21V10.5H11Z"
        fill="currentColor"
      />
    </svg>
  )
}
