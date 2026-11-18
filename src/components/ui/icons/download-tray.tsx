import type { SVGProps } from 'react'

// 16px arrow over a tray (research report "Download report" button). The 12px `download` stays for its callers.
export function DownloadTrayIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg width={16} height={16} viewBox="0 0 16 16" fill="none" {...props}>
      <path
        d="M8 2.5V10M4.75 6.75L8 10L11.25 6.75M2.5 11.5V13.5H13.5V11.5"
        stroke="currentColor"
        strokeWidth={1.25}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
