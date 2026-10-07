import type { HeaderLink, HeaderLogo } from '../header/types'

export type FooterLogo = HeaderLogo

export type FooterLink = HeaderLink

export type FooterColumn = { key: string; title: string; links: FooterLink[] }

export type SocialPlatform = 'youtube' | 'linkedin' | 'x'

export type FooterSocialLink = { key: string; platform: SocialPlatform; href: string }

export type FooterProps = {
  logo: FooterLogo | null
  description: string
  columns: FooterColumn[]
  socialHeading: string
  social: FooterSocialLink[]
  copyright: string
}
