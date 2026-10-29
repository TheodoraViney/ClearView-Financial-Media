import type { SVGProps } from 'react'

export function LinkIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg width={16} height={16} viewBox="0 0 16 16" fill="none" {...props}>
      <path
        d="M6.5 9.5L9.5 6.5M7 4.5L8.25 3.25C9.49 2.01 11.51 2.01 12.75 3.25C13.99 4.49 13.99 6.51 12.75 7.75L11.5 9M9 11.5L7.75 12.75C6.51 13.99 4.49 13.99 3.25 12.75C2.01 11.51 2.01 9.49 3.25 8.25L4.5 7"
        stroke="currentColor"
        strokeLinecap="round"
      />
    </svg>
  )
}
