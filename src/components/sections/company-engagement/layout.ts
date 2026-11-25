// The Company Engagement page's rhythm, shared by its blocks (search and filters, directory and the lists after it).

/** Side padding 16 / 32, and 64 from the header breakpoint (the design's desktop starts at 1200). */
export const PAD = 'px-gutter header:px-16'

/** The card grids: 3 / 2 / 1 columns, 32 apart. */
export const GRID = 'grid gap-8 md:grid-cols-2 header:grid-cols-3'

/** A section after the directory: a full-width rule, 80 above it (64 on mobile), 40 under it. */
export const SECTION = `${PAD} mt-16 flex flex-col gap-6 border-t border-border pt-10 md:mt-20`
