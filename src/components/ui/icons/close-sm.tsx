import type { SVGProps } from 'react'

// The 10px dismiss cross of a hint chip (Categories "Select a topic", topic-hint-close).
export function CloseSmIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg width={10} height={10} viewBox="0 0 10 10" fill="none" {...props}>
      <path d="M2 2L8 8M8 2L2 8" stroke="currentColor" strokeWidth={1.1} strokeLinecap="round" />
    </svg>
  )
}
