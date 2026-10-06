'use client'

import { useEffect, useState } from 'react'

import { formatRelativeTime } from '@/lib/dates'

// Recount after this long so an open page keeps "15 minutes ago" honest.
const TICK = 60 * 1000

/**
 * "2 hours ago". The server renders against `now`, an hourly-cached clock, and hydration reuses it so the markup matches;
 * after mount the text counts from the browser's clock and updates every minute.
 */
export function RelativeTime({ dateTime, now }: { dateTime: string; now: string }) {
  const [current, setCurrent] = useState(now)

  useEffect(() => {
    const update = () => setCurrent(new Date().toISOString())
    update()
    const interval = setInterval(update, TICK)

    return () => clearInterval(interval)
  }, [])

  return <time dateTime={dateTime}>{formatRelativeTime(dateTime, current)}</time>
}
