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
