// Dates render in UK time, the publisher's newsroom clock, so a late-evening post never shows tomorrow's date.
const TIME_ZONE = 'Europe/London'

const LONG = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: TIME_ZONE,
})

const DAY = new Intl.DateTimeFormat('en-GB', { day: '2-digit', timeZone: TIME_ZONE })

// en-GB abbreviates September as "Sept"; the design uses three letters for every month.
const MONTH = new Intl.DateTimeFormat('en-US', { month: 'short', timeZone: TIME_ZONE })

function parse(value: string | null | undefined): Date | null {
  if (!value) {
    return null
  }

  const date = new Date(value)

  return Number.isNaN(date.getTime()) ? null : date
}

/** "16 September 2026" */
export function formatLongDate(value: string | null | undefined): string | null {
  const date = parse(value)

  return date ? LONG.format(date) : null
}

/** "07 Sep" */
export function formatShortDate(value: string | null | undefined): string | null {
  const date = parse(value)

  return date ? `${DAY.format(date)} ${MONTH.format(date)}` : null
}

// Calendar dates (Sanity `date` fields, "2026-05-15") carry no time zone: read and format them in UTC so they never shift a day.
const CALENDAR_DATE = /^(\d{4})-(\d{2})-(\d{2})$/

const CALENDAR_DAY = new Intl.DateTimeFormat('en-GB', { day: 'numeric', timeZone: 'UTC' })
const CALENDAR_MONTH = new Intl.DateTimeFormat('en-US', { month: 'short', timeZone: 'UTC' })
const CALENDAR_MONTH_LONG = new Intl.DateTimeFormat('en-GB', { month: 'long', timeZone: 'UTC' })

type CalendarDate = { day: string; month: string; monthLong: string; year: number }

function parseCalendarDate(value: string | null | undefined): CalendarDate | null {
  const match = value ? CALENDAR_DATE.exec(value) : null

  if (!match) {
    return null
  }

  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])))

  return Number.isNaN(date.getTime())
    ? null
    : {
        day: CALENDAR_DAY.format(date),
        month: CALENDAR_MONTH.format(date),
        monthLong: CALENDAR_MONTH_LONG.format(date),
        year: date.getUTCFullYear(),
      }
}

/** "30 Apr 2026" from "2026-04-30". */
export function formatDay(value: string | null | undefined): string | null {
  const date = parseCalendarDate(value)

  return date ? `${date.day} ${date.month} ${date.year}` : null
}

const longDay = ({ day, monthLong, year }: CalendarDate) => `${day} ${monthLong} ${year}`

/**
 * A calendar date range with full month names, sharing what both ends have in common:
 * "15 May 2026", "15–16 May 2026", "30 April – 2 May 2026", "30 December 2026 – 2 January 2027".
 * A missing or unreadable end renders the start alone.
 */
export function formatDateRange(start: string | null | undefined, end: string | null | undefined): string | null {
  const from = parseCalendarDate(start)
  const to = parseCalendarDate(end)

  if (!from) {
    return null
  }

  if (!to || start === end) {
    return longDay(from)
  }

  if (from.year !== to.year) {
    return `${longDay(from)} – ${longDay(to)}`
  }

  if (from.monthLong !== to.monthLong) {
    return `${from.day} ${from.monthLong} – ${to.day} ${to.monthLong} ${to.year}`
  }

  return `${from.day}–${to.day} ${to.monthLong} ${to.year}`
}

const UK_CALENDAR = new Intl.DateTimeFormat('en-GB', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  timeZone: TIME_ZONE,
})

/** Today's UK calendar date as "2026-10-05", the shape of a Sanity `date` field. */
export function ukToday(now: Date = new Date()): string {
  const parts = Object.fromEntries(UK_CALENDAR.formatToParts(now).map((part) => [part.type, part.value]))

  return `${parts.year}-${parts.month}-${parts.day}`
}

const RELATIVE = new Intl.RelativeTimeFormat('en-GB', { numeric: 'always' })

const MINUTE = 60 * 1000
const HOUR = 60 * MINUTE
const DAY_MS = 24 * HOUR

// Whole calendar months from `from` to `to`, so "2 months ago" turns over on the same day of the month.
function monthsBetween(from: Date, to: Date): number {
  const months = (to.getUTCFullYear() - from.getUTCFullYear()) * 12 + to.getUTCMonth() - from.getUTCMonth()
  const dayEarlier =
    to.getUTCDate() * DAY_MS + (to.getTime() % DAY_MS) < from.getUTCDate() * DAY_MS + (from.getTime() % DAY_MS)

  return dayEarlier ? months - 1 : months
}

/**
 * Elapsed time as "15 minutes ago", "1 hour ago", "30 days ago", "1 month ago", "1 year ago".
 * Minutes under an hour (at least 1, so a clock slightly behind the post never says "in 2 minutes"), hours under a day,
 * days up to 30, then months under 12, then years.
 */
export function formatRelativeTime(value: string | null | undefined, now: Date | number | string): string | null {
  const date = parse(value)

  if (!date) {
    return null
  }

  const current = new Date(now)
  const elapsed = Math.max(0, current.getTime() - date.getTime())

  if (elapsed < HOUR) {
    return RELATIVE.format(-Math.max(1, Math.floor(elapsed / MINUTE)), 'minute')
  }

  if (elapsed < DAY_MS) {
    return RELATIVE.format(-Math.floor(elapsed / HOUR), 'hour')
  }

  const days = Math.floor(elapsed / DAY_MS)

  if (days <= 30) {
    return RELATIVE.format(-days, 'day')
  }

  const months = Math.max(1, monthsBetween(date, current))

  if (months < 12) {
    return RELATIVE.format(-months, 'month')
  }

  return RELATIVE.format(-Math.floor(months / 12), 'year')
}
