// Turns the box an image fills, per breakpoint, into the `sizes` attribute of an `object-cover` image.
// Pure and CMS-agnostic: Media calls it with the image's own aspect ratio.

/** An image after crop: the URL without a width, its pixel size, alt text and the hotspot as CSS `object-position`. */
export type MediaImage = {
  src: string
  width: number
  height: number
  alt: string
  position?: string
}

/**
 * The box the image fills from one breakpoint up.
 * `w` is the box width as a linear function of the viewport: `'328px'`, `'100vw'`, `'100vw - 32px'` or `'58.34vw - 50.67px'`.
 * Then exactly one of: `aspect` (box width / height, e.g. 4 / 3) or `h` (a fixed height in px).
 * With neither, the box takes the image's own aspect (no crop), as in `natural` Media.
 */
export type MediaBox = { w: string; aspect?: number; h?: number }

/** Tailwind breakpoints in rem, plus `page` where `max-w-page` (1440px) stops the layout growing. */
export const BREAKPOINTS = { md: 48, lg: 64, header: 75, xl: 80, page: 90 } as const

/**
 * The box per breakpoint, mobile first. `base` is required; a key applies from that breakpoint up.
 * A layout step at no named breakpoint (an auto-fit grid dropping a column) takes a rem key such as `'70rem'`.
 */
export type MediaSlot = { base: MediaBox } & { [K in keyof typeof BREAKPOINTS]?: MediaBox } & {
  [minWidth: `${number}rem`]: MediaBox | undefined
}

const REM = 16

// `a` is the share of the viewport (1 = 100vw), `b` the px offset: width = a × viewport + b.
type Linear = { a: number; b: number }

const WIDTH = /^\s*(?:(\d+(?:\.\d+)?)vw)?\s*(?:([+-])?\s*(\d+(?:\.\d+)?)px)?\s*$/

function parseWidth(w: string): Linear {
  const match = WIDTH.exec(w)

  if (!match || (match[1] === undefined && match[3] === undefined) || (match[1] === undefined && match[2] === '-')) {
    throw new Error(`Media slot width "${w}" is not "Npx", "Nvw" or "Nvw ± Npx"`)
  }

  const a = match[1] === undefined ? 0 : Number(match[1]) / 100
  const b = match[3] === undefined ? 0 : (match[2] === '-' ? -1 : 1) * Number(match[3])

  return { a, b }
}

function minWidthOf(key: string): number {
  if (key === 'base') {
    return 0
  }

  const rem = key in BREAKPOINTS ? BREAKPOINTS[key as keyof typeof BREAKPOINTS] : Number.parseFloat(key)

  return rem * REM
}

// Rounded up, so the request is never below what the box needs.
const up = (value: number) => Math.ceil(value * 100 - 1e-6) / 100

function cssLength({ a, b }: Linear): string {
  if (a === 0) {
    return `${Math.max(1, Math.ceil(b - 1e-6))}px`
  }

  const vw = up(a * 100)
  const px = Math.ceil(b - 1e-6)

  return px === 0 ? `${vw}vw` : `calc(${vw}vw ${px < 0 ? '-' : '+'} ${Math.abs(px)}px)`
}

function mediaQuery(minWidth: number): string {
  return minWidth % REM === 0 ? `(min-width: ${minWidth / REM}rem)` : `(min-width: ${minWidth}px)`
}

/**
 * The width an `object-cover` image must be requested at is the larger of the box width and the box height
 * times the image aspect: a tall box crops the sides, so it needs a wider image than the box is.
 * A box with an aspect ratio scales with its width, so that stays one linear term (`calc(Avw + Bpx)`).
 * A fixed-height box needs `max(width, h × aspect)`; instead of CSS `max()` inside `sizes`, the range is split
 * at the viewport width where the two meet: a constant px below it, the width term above it. Exact, no math functions.
 */
export function mediaSizes(slot: MediaSlot, imageAspect: number): string {
  const steps = Object.entries(slot)
    .filter((entry): entry is [string, MediaBox] => entry[1] !== undefined)
    .map(([key, box]) => ({ from: minWidthOf(key), box }))
    .sort((x, y) => x.from - y.from)

  const ranges: { from: number; width: Linear }[] = []

  steps.forEach(({ from, box }, index) => {
    const to = steps[index + 1]?.from ?? Infinity
    const { a, b } = parseWidth(box.w)

    if (box.aspect !== undefined) {
      const k = Math.max(1, imageAspect / box.aspect)
      ranges.push({ from, width: { a: a * k, b: b * k } })
      return
    }

    if (box.h !== undefined) {
      const c = box.h * imageAspect
      // The viewport width at which the box width reaches h × aspect.
      const meet = a === 0 ? (b >= c ? -Infinity : Infinity) : (c - b) / a

      if (meet <= from) {
        ranges.push({ from, width: { a, b } })
      } else if (meet >= to) {
        ranges.push({ from, width: { a: 0, b: c } })
      } else {
        ranges.push({ from, width: { a: 0, b: c } })
        ranges.push({ from: Math.ceil(meet), width: { a, b } })
      }
      return
    }

    ranges.push({ from, width: { a, b } })
  })

  // Neighbouring ranges that ask for the same length merge into the lower one.
  const merged = ranges
    .map(({ from, width }) => ({ from, length: cssLength(width) }))
    .filter((range, index, all) => index === 0 || all[index - 1]?.length !== range.length)

  return merged
    .reverse()
    .map(({ from, length }) => (from === 0 ? length : `${mediaQuery(from)} ${length}`))
    .join(', ')
}

/**
 * One of `cols` equal grid tracks with `gap` px between them, as a MediaBox width: in a container that is the
 * viewport minus `inset` px (gutters, a sidebar), or a fixed `px` wide container (from the 1440 page cap).
 */
export function trackWidth(cols: number, gap: number, container: { inset: number } | { px: number }): string {
  const gaps = gap * (cols - 1)

  if ('px' in container) {
    return `${(container.px - gaps) / cols}px`
  }

  return `${100 / cols}vw - ${(container.inset + gaps) / cols}px`
}

/** Box widths per breakpoint, keyed like MediaSlot, for components that add the height part themselves. */
export type MediaWidths = { base: string } & { [K in keyof typeof BREAKPOINTS]?: string } & {
  [minWidth: `${number}rem`]: string | undefined
}

/** A MediaSlot from widths plus the box shape at each step (`aspect` or `h`), given the step's min width in rem. */
export function withBox(widths: MediaWidths, shape: (minWidthRem: number) => Omit<MediaBox, 'w'>): MediaSlot {
  const slot: Record<string, MediaBox> = {}

  for (const [key, w] of Object.entries(widths)) {
    if (w !== undefined) {
      slot[key] = { w, ...shape(minWidthOf(key) / REM) }
    }
  }

  return slot as MediaSlot
}
