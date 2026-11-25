import type { SVGProps } from 'react'

// 2px outline glyph from the About design's assets (cpu-chip.svg), drawn at 48px. Coverage list items.
export function CpuChipIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg width={48} height={48} viewBox="0 0 48 48" fill="none" {...props}>
      <path
        d="M18 4V10M30 4V10M18 38V44M30 38V44M38 18H44M38 28H44M4 18H10M4 28H10M19.6 38H28.4C31.7603 38 33.4405 38 34.7239 37.346C35.8529 36.7708 36.7708 35.8529 37.346 34.7239C38 33.4405 38 31.7603 38 28.4V19.6C38 16.2397 38 14.5595 37.346 13.2761C36.7708 12.1471 35.8529 11.2292 34.7239 10.654C33.4405 10 31.7603 10 28.4 10H19.6C16.2397 10 14.5595 10 13.2761 10.654C12.1471 11.2292 11.2292 12.1471 10.654 13.2761C10 14.5595 10 16.2397 10 19.6V28.4C10 31.7603 10 33.4405 10.654 34.7239C11.2292 35.8529 12.1471 36.7708 13.2761 37.346C14.5595 38 16.2397 38 19.6 38Z"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinejoin="round"
      />
    </svg>
  )
}
