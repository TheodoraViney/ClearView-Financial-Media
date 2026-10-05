import type { SVGProps } from 'react'

export function DownloadIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg width={12} height={12} viewBox="0 0 12 12" fill="none" {...props}>
      <path
        d="M10.5 10.5H1.5M3 6L6 9L9 6M6 9V1.5"
        stroke="currentColor"
        strokeWidth={1}
      />
    </svg>
  )
}
