import 'server-only'

import { stegaClean } from 'next-sanity'

import { brandOrigin, BRANDS, type EditorialBrandKey } from '@/brands'
import { toImage } from '@/sanity/image'

import { absolutePostUrl } from './links'
import { NEWSLETTER_COPY_DEFAULTS, NEWSLETTER_TITLE_PLACEHOLDER, type NewsletterCopy } from './newsletter-copy'

/**
 * HTML of a newsletter issue: the Classic layout. A 600 px white column with the logo and date, an optional top banner,
 * the first post as the featured story, every other post as a row with a thumbnail, an optional bottom banner and a
 * footer.
 *
 * Email-safe: nested presentation tables, inline styles, Arial and Georgia only, and a ghost table that holds Outlook
 * at 600 px. The one <style> block only stacks the article rows on narrow screens. Every CMS value is HTML-escaped,
 * and only http(s) URLs are written.
 */

// The column, and the content width inside its 24 px side padding.
const EMAIL_WIDTH = 600
const CONTENT_WIDTH = 552

const LOGO_HEIGHT = 32
const FOOTER_LOGO_HEIGHT = 22
const FEATURED_IMAGE = { width: CONTENT_WIDTH, height: 300 }
const THUMBNAIL = { width: 160, height: 100 }

// Images are requested at twice their display size for retina screens.
const RETINA = 2
const IMAGE_QUALITY = 80

const SANS = 'Arial,Helvetica,sans-serif'
const SERIF = "Georgia,'Times New Roman',serif"
const TEXT_COLOR = '#1f2b32'
const MUTED_COLOR = '#6b7780'
const RULE_COLOR = '#e3e7ea'
const FOOTER_BACKGROUND = '#f6f7f8'
const PAGE_BACKGROUND = '#f3f5f6'

type EmailImage = Parameters<typeof toImage>[0]

export type NewsletterEmailPost = {
  title: string | null
  excerpt: string | null
  slug: string | null
  image: EmailImage
}

export type NewsletterEmailBanner = { image: EmailImage; link: string | null } | null

export type NewsletterEmailInput = {
  brand: EditorialBrandKey
  /** Brand settings title; falls back to the code default. */
  brandTitle: string | null
  /** Brand settings domain, shown in the footer; falls back to the code default. */
  domain: string | null
  /** Brand settings colour; falls back to the code default. */
  brandColor: string | null
  logo: EmailImage
  /** Brand settings → Newsletter → Email copy. An empty value hides its element; unsubscribe falls back to the default. */
  copy: Partial<Record<keyof NewsletterCopy, string | null>> | null
  subject: string
  /** The issue date shown under the logo. */
  date: Date
  posts: NewsletterEmailPost[]
  topBanner: NewsletterEmailBanner
  bottomBanner: NewsletterEmailBanner
}

/** What the section helpers share, cleaned once. */
type Context = {
  brand: EditorialBrandKey
  title: string
  /** A #rrggbb value, safe in a style attribute. */
  color: string
  copy: NewsletterCopy
  logo: EmailImage
}

// Braces too, so CMS text can never form Brevo template syntax such as {{ contact.EMAIL }}.
const ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
  '{': '&#123;',
  '}': '&#125;',
}

/** Escapes text for HTML element content and double-quoted attributes, and for Brevo's templating. Cleans stega first. */
export function escapeHtml(value: string | null | undefined): string {
  return (stegaClean(value) ?? '').replace(/[&<>"'{}]/g, (char) => ESCAPES[char])
}

/** The URL when it is absolute http(s), else null. */
function httpUrl(value: string | null | undefined): string | null {
  try {
    const url = new URL(stegaClean(value) ?? '')

    return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : null
  } catch {
    return null
  }
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

/** The Sanity CDN URL with the given parameters. SVGs are rasterised, since Gmail and Outlook do not render them. */
function cdnUrl(url: URL, params: Record<string, string | number>): string | null {
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, String(value))
  }

  if (url.pathname.toLowerCase().endsWith('.svg')) {
    url.searchParams.set('fm', 'png')
  }

  // URLSearchParams encodes the commas in `rect`; Sanity reads either form, the plain one is easier to read.
  return httpUrl(url.href.replaceAll('%2C', ','))
}

type SizedImage = { src: string; width: number; height: number; alt: string }

/** An image as a PNG of the given display height, its width from the aspect ratio. For the logo. */
function imageByHeight(image: EmailImage, height: number): SizedImage | null {
  const media = toImage(image)

  if (!media || media.height <= 0) {
    return null
  }

  const src = cdnUrl(new URL(media.src), { h: height * RETINA, fm: 'png', fit: 'max' })

  return src ? { src, width: Math.round((height * media.width) / media.height), height, alt: media.alt } : null
}

/** The hotspot as fractions of the cropped image, parsed from toImage's CSS `object-position`; centre when unset. */
function focusOf(position: string | undefined) {
  const match = /^([\d.]+)% ([\d.]+)%$/.exec(position ?? '')

  return match ? { x: Number(match[1]) / 100, y: Number(match[2]) / 100 } : { x: 0.5, y: 0.5 }
}

/**
 * An image cut to exactly the given display size. Within the editor's crop, the largest region of the target aspect
 * ratio centred on the hotspot (as @sanity/image-url does) becomes the `rect`, so the CDN never cuts the subject off.
 */
function imageCropped(image: EmailImage, width: number, height: number): SizedImage | null {
  const media = toImage(image)

  if (!media || media.width <= 0 || media.height <= 0) {
    return null
  }

  const url = new URL(media.src)
  const [left = 0, top = 0] = (url.searchParams.get('rect') ?? '').split(',').map(Number)
  const focus = focusOf(media.position)
  const scale = Math.min(media.width / width, media.height / height)
  const rectWidth = Math.max(1, Math.round(width * scale))
  const rectHeight = Math.max(1, Math.round(height * scale))
  const rectLeft = left + Math.round(clamp(focus.x * media.width - rectWidth / 2, 0, media.width - rectWidth))
  const rectTop = top + Math.round(clamp(focus.y * media.height - rectHeight / 2, 0, media.height - rectHeight))

  const src = cdnUrl(url, {
    rect: `${rectLeft},${rectTop},${rectWidth},${rectHeight}`,
    w: width * RETINA,
    h: height * RETINA,
    fit: 'crop',
    q: IMAGE_QUALITY,
  })

  return src ? { src, width, height, alt: media.alt } : null
}

/** An image at its own aspect ratio, as wide as it is up to `maxWidth`. For banners. */
function imageNatural(image: EmailImage, maxWidth: number): SizedImage | null {
  const media = toImage(image)

  if (!media || media.width <= 0 || media.height <= 0) {
    return null
  }

  const width = Math.min(media.width, maxWidth)
  const height = Math.round((width * media.height) / media.width)
  const src = cdnUrl(new URL(media.src), { w: width * RETINA, fit: 'max', q: IMAGE_QUALITY })

  return src ? { src, width, height, alt: media.alt } : null
}

/** "Thursday 15 October 2026", UK time. */
export function formatIssueDate(date: Date): string {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/London',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).formatToParts(date)
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value ?? ''

  return `${part('weekday')} ${part('day')} ${part('month')} ${part('year')}`
}

function brandColorOf(brand: EditorialBrandKey, value: string | null): string {
  const color = stegaClean(value)?.trim()

  return color && /^#[0-9a-fA-F]{6}$/.test(color) ? color : BRANDS[brand].brandColor
}

function copyOf(copy: NewsletterEmailInput['copy']): NewsletterCopy {
  const pick = (key: keyof NewsletterCopy) => stegaClean(copy?.[key])?.trim() ?? ''

  return {
    featuredLabel: pick('featuredLabel'),
    readFullStory: pick('readFullStory'),
    readMore: pick('readMore'),
    advertisementLabel: pick('advertisementLabel'),
    footerText: pick('footerText'),
    // Never hidden: Brevo and the law need an unsubscribe link in every email.
    unsubscribe: pick('unsubscribe') || NEWSLETTER_COPY_DEFAULTS.unsubscribe,
  }
}

/** The excerpt, or null when it is empty or only whitespace. */
const excerptOf = (post: NewsletterEmailPost | undefined) => stegaClean(post?.excerpt)?.trim() || null

const postHref = (brand: EditorialBrandKey, post: NewsletterEmailPost) => {
  const slug = stegaClean(post.slug)

  return slug ? httpUrl(absolutePostUrl(brand, slug)) : null
}

/** An <img> with its size in attributes. `fluid` lets it shrink with the column and fill it when rows stack. */
function img(image: SizedImage, { fluid = false, className = '' } = {}) {
  const size = fluid ? `width:100%;max-width:${image.width}px;height:auto;` : `width:${image.width}px;height:${image.height}px;`

  return `<img src="${escapeHtml(image.src)}" width="${image.width}" height="${image.height}" alt="${escapeHtml(image.alt)}"${className ? ` class="${className}"` : ''} style="display:block;border:0;outline:none;text-decoration:none;${size}">`
}

/** Wraps markup in a link when there is an href. */
const linked = (href: string | null, html: string, style = 'text-decoration:none;') =>
  href ? `<a href="${escapeHtml(href)}" target="_blank" style="${style}">${html}</a>` : html

const table = (rows: string, attributes = 'width="100%"') =>
  `<table role="presentation" ${attributes} cellpadding="0" cellspacing="0" border="0">${rows}</table>`

function header({ title, color, logo }: Context, date: Date) {
  const png = imageByHeight(logo, LOGO_HEIGHT)
  const mark = png
    ? img({ ...png, alt: title })
    : `<span style="font-family:${SERIF};font-size:26px;line-height:32px;font-weight:bold;color:${TEXT_COLOR};">${escapeHtml(title)}</span>`

  return `<tr><td align="center" style="padding:28px 24px 18px;border-bottom:3px solid ${color};">${table(
    `<tr><td align="center">${mark}</td></tr><tr><td align="center" style="padding-top:10px;font-family:${SANS};font-size:12px;line-height:16px;letter-spacing:.04em;text-transform:uppercase;color:${MUTED_COLOR};">${escapeHtml(formatIssueDate(date))}</td></tr>`,
    'align="center"',
  )}</td></tr>`
}

/** A banner with its label (when set), or nothing when the slot is empty or its link is not http(s). */
function banner({ copy }: Context, slot: NewsletterEmailBanner, padding: string) {
  const image = slot ? imageNatural(slot.image, CONTENT_WIDTH) : null
  const href = slot ? httpUrl(slot.link) : null

  if (!image || !href) {
    return ''
  }

  return `<tr><td align="center" style="padding:${padding};">${table(
    `${copy.advertisementLabel ? `<tr><td align="center" style="padding-bottom:6px;font-family:${SANS};font-size:10px;line-height:12px;letter-spacing:.12em;text-transform:uppercase;color:#8a959c;">${escapeHtml(copy.advertisementLabel)}</td></tr>` : ''}<tr><td align="center">${linked(href, img(image, { fluid: true }))}</td></tr>`,
  )}</td></tr>`
}

function button({ color }: Context, href: string, label: string) {
  return table(
    `<tr><td bgcolor="${color}" style="border-radius:3px;background:${color};mso-padding-alt:12px 20px;"><a href="${escapeHtml(href)}" target="_blank" style="display:inline-block;padding:12px 20px;font-family:${SANS};font-size:14px;line-height:14px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:3px;">${escapeHtml(label)}</a></td></tr>`,
    'align="left"',
  )
}

function featured(context: Context, post: NewsletterEmailPost) {
  const href = postHref(context.brand, post)
  const image = imageCropped(post.image, FEATURED_IMAGE.width, FEATURED_IMAGE.height)
  const excerpt = excerptOf(post)
  const rows = [
    image ? `<tr><td>${linked(href, img(image, { fluid: true }))}</td></tr>` : '',
    context.copy.featuredLabel
      ? `<tr><td style="padding-top:${image ? 12 : 0}px;font-family:${SANS};font-size:11px;line-height:13px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:${context.color};">${escapeHtml(context.copy.featuredLabel)}</td></tr>`
      : '',
    `<tr><td style="padding-top:${image || context.copy.featuredLabel ? 12 : 0}px;"><h1 style="margin:0;font-family:${SERIF};font-size:26px;line-height:1.2;font-weight:700;color:${TEXT_COLOR};">${linked(href, escapeHtml(post.title), `color:${TEXT_COLOR};text-decoration:none;`)}</h1></td></tr>`,
    excerpt
      ? `<tr><td style="padding-top:12px;font-family:${SANS};font-size:15px;line-height:1.55;color:#3d4a52;">${escapeHtml(excerpt)}</td></tr>`
      : '',
    href && context.copy.readFullStory
      ? `<tr><td style="padding-top:12px;">${button(context, href, context.copy.readFullStory)}</td></tr>`
      : '',
  ]

  return `<tr><td style="padding:24px;">${table(rows.join(''))}</td></tr>`
}

function listItem(context: Context, post: NewsletterEmailPost) {
  const href = postHref(context.brand, post)
  const image = imageCropped(post.image, THUMBNAIL.width, THUMBNAIL.height)
  const excerpt = excerptOf(post)
  const text = [
    `<h2 style="margin:0 0 6px;font-family:${SERIF};font-size:17px;line-height:1.3;font-weight:700;color:${TEXT_COLOR};">${linked(href, escapeHtml(post.title), `color:${TEXT_COLOR};text-decoration:none;`)}</h2>`,
    excerpt
      ? `<p style="margin:0 0 8px;font-family:${SANS};font-size:13px;line-height:1.5;color:#4a575f;">${escapeHtml(excerpt)}</p>`
      : '',
    href && context.copy.readMore
      ? `<a href="${escapeHtml(href)}" target="_blank" style="font-family:${SANS};font-size:13px;line-height:1.5;font-weight:700;color:${context.color};text-decoration:none;">${escapeHtml(context.copy.readMore)}</a>`
      : '',
  ].join('')
  const thumbnail = image
    ? `<td class="wb-stack wb-thumb" width="${THUMBNAIL.width}" valign="top" style="width:${THUMBNAIL.width}px;padding-right:16px;">${linked(href, img(image, { className: 'wb-fluid' }))}</td>`
    : ''

  return `<tr><td style="padding:18px 0;border-top:1px solid ${RULE_COLOR};">${table(
    `<tr>${thumbnail}<td class="wb-stack" valign="top">${text}</td></tr>`,
  )}</td></tr>`
}

function footer({ brand, title, copy, logo }: Context, domain: string) {
  const png = imageByHeight(logo, FOOTER_LOGO_HEIGHT)
  const mark = png
    ? `<tr><td align="center" style="padding-bottom:10px;">${img({ ...png, alt: title })}</td></tr>`
    : ''
  const sentence = copy.footerText ? `${escapeHtml(copy.footerText.replaceAll(NEWSLETTER_TITLE_PLACEHOLDER, title))}<br>` : ''
  const link = `color:${MUTED_COLOR};text-decoration:underline;`
  const site = httpUrl(brandOrigin(brand))

  return `<tr><td bgcolor="${FOOTER_BACKGROUND}" style="padding:24px;background:${FOOTER_BACKGROUND};">${table(
    `${mark}<tr><td align="center" style="font-family:${SANS};font-size:12px;line-height:1.6;color:${MUTED_COLOR};">${sentence}<a href="{{ unsubscribe }}" target="_blank" style="${link}">${escapeHtml(copy.unsubscribe)}</a> &middot; ${linked(site, escapeHtml(domain), link)}</td></tr>`,
  )}</td></tr>`
}

/** The preheader: the inbox preview line, hidden in the email itself. Padded so the body text does not follow it. */
const preheader = (text: string | null) =>
  text
    ? `<div style="display:none;max-height:0;max-width:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:#ffffff;opacity:0;">${escapeHtml(text)}${'&#847;&zwnj;&nbsp;'.repeat(40)}</div>`
    : ''

// Narrow screens: the column fills the width and each article row stacks its thumbnail above the text.
const RESPONSIVE_STYLE = `@media (max-width:480px){.wb-stack{display:block!important;width:100%!important;}.wb-thumb{padding:0 0 12px!important;}.wb-fluid{width:100%!important;height:auto!important;}}`

export function renderNewsletterEmail(input: NewsletterEmailInput): string {
  const { brand, posts } = input
  const context: Context = {
    brand,
    title: stegaClean(input.brandTitle)?.trim() || BRANDS[brand].title,
    color: brandColorOf(brand, input.brandColor),
    copy: copyOf(input.copy),
    logo: input.logo,
  }
  const domain = stegaClean(input.domain)?.trim() || BRANDS[brand].domain
  const [first, ...rest] = posts
  const topBanner = banner(context, input.topBanner, '16px 24px 0')
  const bottomBanner = banner(context, input.bottomBanner, '24px 24px 0')

  const rows = [
    header(context, input.date),
    topBanner,
    first ? featured(context, first) : '',
    rest.length > 0
      ? `<tr><td style="padding:0 24px;">${table(rest.map((post) => listItem(context, post)).join(''))}</td></tr>`
      : '',
    bottomBanner,
    `<tr><td style="height:32px;line-height:32px;font-size:0;">&nbsp;</td></tr>`,
    footer(context, domain),
  ]

  return `<!doctype html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<meta name="x-apple-disable-message-reformatting">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>${escapeHtml(input.subject)}</title>
<!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
<style>${RESPONSIVE_STYLE}</style>
</head>
<body style="margin:0;padding:0;background:${PAGE_BACKGROUND};">
${preheader(excerptOf(first) || stegaClean(first?.title)?.trim() || input.subject)}
${table(
  `<tr><td align="center" style="padding:24px 0;">
<!--[if mso]><table role="presentation" width="${EMAIL_WIDTH}" align="center" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
${table(rows.join('\n'), `width="${EMAIL_WIDTH}" align="center" bgcolor="#ffffff" style="width:100%;max-width:${EMAIL_WIDTH}px;background:#ffffff;color:${TEXT_COLOR};font-family:${SANS};"`)}
<!--[if mso]></td></tr></table><![endif]-->
</td></tr>`,
  `width="100%" bgcolor="${PAGE_BACKGROUND}" style="background:${PAGE_BACKGROUND};"`,
)}
</body>
</html>`
}
