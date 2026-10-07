import type { SVGProps } from 'react'

// Filled 24-unit X (Twitter) glyph from the design's uploads (x-twitter.svg), footer social link.
export function XIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg width={24} height={24} viewBox="0 0 24 24" fill="none" {...props}>
      <path
        d="M13.5222 10.7749L19.4785 4H18.0671L12.8952 9.88256L8.76437 4H4L10.2466 12.8955L4 20H5.41155L10.8732 13.7878L15.2356 20H20L13.5222 10.7749ZM5.92015 5.03974H8.0882L18.0677 19.0075H15.8997L5.92015 5.03974Z"
        fill="currentColor"
      />
    </svg>
  )
}
