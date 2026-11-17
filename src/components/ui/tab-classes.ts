/*
 * The tab look shared by `SectionNav` (in-page anchors) and `TabLinks` (links to other pages): shared-shell
 * awards-programme-tabs. 48px items 16/16, grey with a dark hover, the current one accent with a 2px bar inside its
 * bottom edge, colour 180ms ease-out. A plain module, so the client `SectionNav` and the server `TabLinks` both read it.
 */

/**
 * The row: scrolls sideways without a scrollbar. The caller adds the gap, and any side inset (`SectionNav` keeps 2px;
 * `TabLinks` starts flush, as its design). The items draw their focus outline inside their box, so the row's overflow
 * never clips it.
 */
export const TAB_ROW = 'relative flex overflow-x-auto overflow-y-hidden scrollbar-none'

export const TAB_ITEM =
  'flex h-12 items-center text-base leading-none whitespace-nowrap transition-colors duration-180 ease-out focus-visible:-outline-offset-2'

export const TAB_CURRENT = 'text-accent inset-shadow-bar'

export const TAB_IDLE = 'text-grey hover:text-foreground'
