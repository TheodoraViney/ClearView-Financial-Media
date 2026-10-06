import type { SVGProps } from 'react'

// 2px outline glyph from the design's uploads (benefit-public-icon), drawn at 48px. Stats bar tiles.
export function StatPublicIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg width={48} height={48} viewBox="0 0 48 48" fill="none" {...props}>
      <path
        d="M14 28C14 22.4772 18.4772 18 24 18C29.5228 18 34 22.4772 34 28M14 28H34M14 28H10M34 28H38M38 28H44M38 28L36 46H12L10 28M4 28H10M30 8C30 11.3137 27.3137 14 24 14C20.6863 14 18 11.3137 18 8C18 4.68629 20.6863 2 24 2C27.3137 2 30 4.68629 30 8Z"
        stroke="currentColor"
        strokeWidth={2}
      />
    </svg>
  )
}
