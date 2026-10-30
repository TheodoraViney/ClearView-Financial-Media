import { stegaClean } from '@sanity/client/stega'

/*
 * The share rail's networks, edited per brand in the "Article page" document. Each network's address is a template:
 * `{url}` becomes the article's address and `{title}` its title, both URL-encoded. One rule serves the Studio
 * validation and the runtime guard, because the Content API accepts writes that never ran the Studio's.
 */

export const SHARE_URL_PLACEHOLDER = '{url}'
export const SHARE_TITLE_PLACEHOLDER = '{title}'

// The networks a new "Article page" document starts with, as the rail had them in code. Editors upload the icons.
export const SHARE_LINK_DEFAULTS = [
  { key: 'linkedin', label: 'Share on LinkedIn', url: 'https://www.linkedin.com/sharing/share-offsite/?url={url}' },
  { key: 'x', label: 'Share on X', url: 'https://x.com/intent/post?url={url}&text={title}' },
] as const

// Most networks a rail holds: with Copy link that is seven 44px buttons beside the text.
export const SHARE_LINKS_MAX = 6

// Whitespace and control characters: browsers strip some of them before parsing, which can change the scheme.
const UNSAFE_CHARACTERS = /[\s\u0000-\u001F\u007F]/

const PLACEHOLDER = /\{[^}]*\}/g

/** Why a share address template is invalid, or null when it is valid. */
export function shareTemplateError(value: string | null | undefined): string | null {
  const template = stegaClean(value ?? '')

  if (!template) {
    return 'Required'
  }

  if (UNSAFE_CHARACTERS.test(template)) {
    return 'Remove spaces and line breaks'
  }

  if (!template.startsWith('https://')) {
    return 'Must start with https://'
  }

  if (!template.includes(SHARE_URL_PLACEHOLDER)) {
    return `Must contain ${SHARE_URL_PLACEHOLDER}, where the article address goes`
  }

  const unknown = (template.match(PLACEHOLDER) ?? []).find(
    (token) => token !== SHARE_URL_PLACEHOLDER && token !== SHARE_TITLE_PLACEHOLDER,
  )

  if (unknown) {
    return `Unknown placeholder ${unknown}: only ${SHARE_URL_PLACEHOLDER} and ${SHARE_TITLE_PLACEHOLDER} are filled in`
  }

  if (!shareHref(template, 'https://example.com/posts/example', 'Example')) {
    return 'Not a valid https:// address'
  }

  return null
}

/**
 * The share address for an article: the template with `{url}` and `{title}` filled in, URL-encoded. Null when the
 * result is not an https address with a host, so an invalid item is dropped rather than rendered.
 */
export function shareHref(template: string | null | undefined, url: string, title: string): string | null {
  const clean = stegaClean(template ?? '')

  if (!clean.startsWith('https://') || !clean.includes(SHARE_URL_PLACEHOLDER) || UNSAFE_CHARACTERS.test(clean)) {
    return null
  }

  const href = clean
    .replaceAll(SHARE_URL_PLACEHOLDER, encodeURIComponent(url))
    .replaceAll(SHARE_TITLE_PLACEHOLDER, encodeURIComponent(stegaClean(title)))

  try {
    const parsed = new URL(href)

    return parsed.protocol === 'https:' && parsed.hostname ? href : null
  } catch {
    return null
  }
}
