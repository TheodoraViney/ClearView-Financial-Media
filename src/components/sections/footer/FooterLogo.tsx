import type { FooterLogo as FooterLogoProps } from './types'

/** The brand logo in the footer, not a link (as the masters). Width per brand and breakpoint from `--footer-logo`; alt is the brand title. */
export function FooterLogo({ logo }: { logo: FooterLogoProps | null }) {
  if (!logo) {
    return null
  }

  return (
    // An SVG from the CMS, served as is: next/image would need dangerouslyAllowSVG for it.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={logo.src}
      width={logo.width}
      height={logo.height}
      alt={logo.alt}
      className="block h-auto w-footer-logo max-w-full"
    />
  )
}
