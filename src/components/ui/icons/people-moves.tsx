import type { SVGProps } from 'react'

// Filled 32-unit glyph from the design's assets (people-moves-icon), drawn at 32px. Explore "People Moves".
export function PeopleMovesIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg width={32} height={32} viewBox="0 0 32 32" fill="none" {...props}>
      <circle cx="11" cy="8" r="4" fill="currentColor" />
      <path d="M11 14C6.58 14 3 17.58 3 22V23H19V22C19 17.58 15.42 14 11 14Z" fill="currentColor" />
      <path d="M21 18H27.29L24.4 15.1L25.1 14.4L29.2 18.5L25.1 22.6L24.4 21.9L27.29 19H21V18Z" fill="currentColor" />
    </svg>
  )
}
