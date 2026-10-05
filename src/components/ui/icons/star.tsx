import type { SVGProps } from 'react'

// Filled 64-unit glyph from the design's uploads (star-icon-8c544710), drawn at 32px.
export function StarIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg width={32} height={32} viewBox="0 0 64 64" fill="none" {...props}>
      <path
        d="M32 4C34.367 18.3701 45.6299 29.633 60 32C45.6299 34.367 34.367 45.6299 32 60C29.633 45.6299 18.3701 34.367 4 32C18.3701 29.633 29.633 18.3701 32 4Z"
        fill="currentColor"
      />
    </svg>
  )
}
