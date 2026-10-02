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
