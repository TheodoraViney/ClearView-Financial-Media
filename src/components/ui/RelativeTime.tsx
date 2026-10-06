'use client'

import { useSyncExternalStore } from 'react'

import { formatRelativeTime } from '@/lib/dates'

// The browser's clock, read once per page load so every card counts from the same moment.
let loadedAt: string | undefined
const browserNow = () => (loadedAt ??= new Date().toISOString())
const subscribe = () => () => {}

/**
 * "2 hours ago". The server renders against `now`, an hourly-cached clock, and hydration reuses it so the markup matches;
 * right after hydration React switches to the browser's clock once.
 */
export function RelativeTime({ dateTime, now }: { dateTime: string; now: string }) {
  const current = useSyncExternalStore(subscribe, browserNow, () => now)

  return <time dateTime={dateTime}>{formatRelativeTime(dateTime, current)}</time>
}
