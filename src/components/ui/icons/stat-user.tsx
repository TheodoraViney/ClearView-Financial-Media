import type { SVGProps } from 'react'

// 2px outline glyph from the design's uploads (benefit-user-circle-icon), drawn at 48px. Stats bar tiles.
export function StatUserIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg width={48} height={48} viewBox="0 0 48 48" fill="none" {...props}>
      <path
        d="M12 40.0015C15.3426 42.5122 19.4976 44 24 44C28.5033 44 32.659 42.5116 36.0019 40C40.8586 36.3511 44 30.5424 44 24C44 12.9543 35.0457 4 24 4C12.9543 4 4 12.9543 4 24C4 30.5433 7.14221 36.3526 12 40.0015ZM36.0019 40C33.126 37.1241 28.5616 35.9981 24 36C19.4305 36.0019 14.8638 37.1366 12 40.0015M32 22C32 26.4183 28.4183 30 24 30C19.5817 30 16 26.4183 16 22C16 17.5817 19.5817 14 24 14C28.4183 14 32 17.5817 32 22Z"
        stroke="currentColor"
        strokeWidth={2}
      />
    </svg>
  )
}
