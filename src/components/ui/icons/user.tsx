import type { SVGProps } from 'react'

// 2px outline glyph from the About design's assets (user.svg), drawn at 48px. Coverage list items.
export function UserIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg width={48} height={48} viewBox="0 0 48 48" fill="none" {...props}>
      <path
        d="M6 40C10.6716 35.0452 17.014 32 24 32C30.986 32 37.3284 35.0452 42 40M33 15C33 19.9706 28.9706 24 24 24C19.0294 24 15 19.9706 15 15C15 10.0294 19.0294 6 24 6C28.9706 6 33 10.0294 33 15Z"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinejoin="round"
      />
    </svg>
  )
}
