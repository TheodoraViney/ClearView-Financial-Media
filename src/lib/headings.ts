/** HTML heading levels an editor can choose for a section heading. */
export const HEADING_LEVELS = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'] as const

export type HeadingLevel = (typeof HEADING_LEVELS)[number]

export const isHeadingLevel = (value: unknown): value is HeadingLevel =>
  typeof value === 'string' && (HEADING_LEVELS as readonly string[]).includes(value)
