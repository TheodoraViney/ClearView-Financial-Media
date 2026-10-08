// Hover motion for the shared ui components.
// `smooth` (the default): every breakpoint uses 180ms ease-smooth and the chevron shifts 3px on hover.
// `responsive`: below lg as in the responsive design file (180ms ease-out, static chevron), from lg as in the desktop file (180ms ease-smooth, 3px shift).
export type Motion = 'smooth' | 'responsive'

// Colour, background and opacity transitions.
export const EASE: Record<Motion, string> = {
  smooth: 'duration-180 ease-smooth',
  responsive: 'duration-180 ease-out lg:ease-smooth',
}

// Chevron inside a `group` link or button.
export const CHEVRON: Record<Motion, string> = {
  smooth: 'transition-transform duration-180 ease-smooth group-hover:translate-x-0.75',
  responsive: 'lg:transition-transform lg:duration-180 lg:ease-smooth lg:group-hover:translate-x-0.75',
}

// Header controls switch with the header layouts at the `header` breakpoint (1200), not at lg:
// ease-out below it as in the responsive file, ease-smooth from it as in the desktop file.
export const HEADER_EASE = 'duration-180 ease-out header:ease-smooth'

// Footer links and social icons, by footer type. The group (ClearView) footer follows the header:
// ease-out below 1200, ease-smooth from it (V2.2 desktop). The publication footer masters use ease-out throughout.
export type ShellVariant = 'group' | 'publication'

export const FOOTER_EASE: Record<ShellVariant, string> = {
  group: HEADER_EASE,
  publication: 'duration-180 ease-out',
}
