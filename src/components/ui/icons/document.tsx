import type { SVGProps } from 'react'

// Filled 64-unit glyph from the design's uploads (document-icon), drawn at 32px.
export function DocumentIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg width={32} height={32} viewBox="0 0 64 64" fill="none" {...props}>
      <path
        d="M34 25H51V56H13L13 8H34V25Z M50 23H36V9L50 23Z"
        fill="currentColor"
      />
    </svg>
  )
}
