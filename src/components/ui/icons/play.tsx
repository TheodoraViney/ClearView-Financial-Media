import type { SVGProps } from 'react'

// Filled play triangle (awards programme highlight video). Drawn on a 20 grid, shown at 16.
export function PlayIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg width={16} height={16} viewBox="0 0 20 20" fill="none" {...props}>
      <path d="M5 3.5L16 10L5 16.5V3.5Z" fill="currentColor" />
    </svg>
  )
}
