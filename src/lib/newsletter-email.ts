import 'server-only'

import { stegaClean } from 'next-sanity'

import { BRANDS, type EditorialBrandKey } from '@/brands'
import { toImage } from '@/sanity/image'

import { absolutePostUrl } from './links'

/**
 * Placeholder HTML for a newsletter issue. Email-safe: one centred table, inline styles, no web fonts, no CSS
 * classes. The real design replaces this later. Every CMS value is HTML-escaped, and only http(s) URLs are written.
 */

// Shown at this width in the email; the PNG is requested at twice that for retina screens.
const LOGO_WIDTH = 200

export type NewsletterEmailPost = {
  title: string | null
  excerpt: string | null
  slug: string | null
}

export type NewsletterEmailInput = {
  brand: EditorialBrandKey
  /** Brand settings title; falls back to the code default. */
  brandTitle: string | null
  logo: Parameters<typeof toImage>[0]
  subject: string
  posts: NewsletterEmailPost[]
}

const ESCAPES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }

/** Escapes text for HTML element content and double-quoted attributes. Cleans stega first. */
export function escapeHtml(value: string | null | undefined): string {
  return (stegaClean(value) ?? '').replace(/[&<>"']/g, (char) => ESCAPES[char])
}

/** The URL when it is absolute http(s), else null. */
function httpUrl(value: string): string | null {
  try {
    const url = new URL(value)

    return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : null
  } catch {
    return null
  }
}

/**
 * The logo as a PNG from the Sanity image CDN. The brand logos are SVG, which Gmail and Outlook do not render, so
 * the CDN rasterises it (`fm=png`) at twice the display width.
 */
function logoPng(logo: NewsletterEmailInput['logo']) {
  const image = toImage(logo)

  if (!image) {
    return null
  }

  const url = new URL(image.src)
  url.searchParams.set('w', String(LOGO_WIDTH * 2))
  url.searchParams.set('fm', 'png')
  url.searchParams.set('fit', 'max')

  const src = httpUrl(url.href.replaceAll('%2C', ','))
  const height = image.width > 0 ? Math.round((LOGO_WIDTH * image.height) / image.width) : null

  return src ? { src, height } : null
}

export function renderNewsletterEmail({ brand, brandTitle, logo, subject, posts }: NewsletterEmailInput): string {
  const title = escapeHtml(brandTitle || BRANDS[brand].title)
  const png = logoPng(logo)

  const header = png
    ? `<img src="${escapeHtml(png.src)}" width="${LOGO_WIDTH}"${png.height ? ` height="${png.height}"` : ''} alt="${title}" style="display:block;border:0;outline:none;text-decoration:none;max-width:100%;height:auto;">`
    : `<span style="font-size:22px;font-weight:bold;color:#111111;">${title}</span>`

  const items = posts
    .map((post) => {
      const slug = stegaClean(post.slug)
      const href = slug ? httpUrl(absolutePostUrl(brand, slug)) : null
      const headline = escapeHtml(post.title)
      const excerpt = post.excerpt
        ? `<p style="margin:6px 0 0;font-size:15px;line-height:22px;color:#444444;">${escapeHtml(post.excerpt)}</p>`
        : ''
      const heading = href
        ? `<a href="${escapeHtml(href)}" style="color:#111111;text-decoration:none;">${headline}</a>`
        : headline

      return `<tr><td style="padding:16px 0;border-top:1px solid #e5e5e5;"><h2 style="margin:0;font-size:18px;line-height:24px;font-weight:bold;">${heading}</h2>${excerpt}</td></tr>`
    })
    .join('')

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f4;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f4f4f4;">
<tr><td align="center" style="padding:24px 12px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background:#ffffff;font-family:Arial,Helvetica,sans-serif;">
<tr><td style="padding:24px 24px 8px;">${header}</td></tr>
<tr><td style="padding:0 24px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${items}</table></td></tr>
<tr><td style="padding:16px 24px 24px;border-top:1px solid #e5e5e5;font-size:12px;line-height:18px;color:#777777;">You receive this email because you subscribed to ${title}. <a href="{{ unsubscribe }}" style="color:#777777;">Unsubscribe</a></td></tr>
</table>
</td></tr>
</table>
</body>
</html>`
}
