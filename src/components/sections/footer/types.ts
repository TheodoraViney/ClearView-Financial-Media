import type { HeaderLink, HeaderLogo } from '../header/types'

export type FooterLogo = HeaderLogo

export type FooterLink = HeaderLink

export type FooterColumn = { key: string; title: string; links: FooterLink[] }

/** One social link: `name` is its accessible name, `iconSrc` the uploaded icon used as a mask. */
export type FooterSocialLink = { key: string; name: string; href: string; iconSrc: string }

export type FooterProps = {
  logo: FooterLogo | null
  description: string
  columns: FooterColumn[]
  socialHeading: string
  social: FooterSocialLink[]
  copyright: string
}
