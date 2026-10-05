import type { SVGProps } from 'react'

// Filled 64-unit glyph from the design's uploads (public-icon), drawn at 32px.
export function PublicIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg width={32} height={32} viewBox="0 0 64 64" fill="none" {...props}>
      <path
        d="M56 39H49.3701L47 60.333H17L14.6299 39H8V37H56V39Z M32 23C38.9138 23 44.5986 28.2622 45.2676 35H18.7324C19.4014 28.2622 25.0862 23 32 23Z M32 3.66699C36.4182 3.66704 40 7.24874 40 11.667C39.9998 16.0851 36.4181 19.6669 32 19.667C27.5818 19.667 24.0002 16.0851 24 11.667C24 7.24871 27.5817 3.66699 32 3.66699Z"
        fill="currentColor"
      />
    </svg>
  )
}
