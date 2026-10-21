import { createHash } from 'node:crypto'

/**
 * Legacy article URLs and the map that redirects them to the archive.
 *
 * The map lives in `data/legacy-redirects/{shard}.json`, each shard an object
 * of `{ [legacy key]: target path }`. The key holds no domain: on all three
 * editorial domains a legacy path leads to the same article, so the redirect
 * stays on the domain it came in on. `scripts/build-legacy-redirects.mjs`
 * writes the shards with the functions below, so lookups and the build always
 * agree on the key. Keep this file free of `@/` imports: the scripts load it
 * directly with Node.
 */

export const LEGACY_REDIRECTS_DIR = 'data/legacy-redirects'

/** Request header in which the proxy hands the original legacy path and query to the redirect handler. */
export const LEGACY_URL_HEADER = 'x-legacy-url'

/** wealthbriefing.com used `/html/article.php/...`, the other two `/article.php/...`. */
const LEGACY_ARTICLE_PATH = /^\/(?:html\/)?article\.php(?:\/|$)/

const LEGACY_ID = /^[1-9]\d{0,8}$/

export function isLegacyArticlePath(pathname: string): boolean {
  return LEGACY_ARTICLE_PATH.test(pathname)
}

/**
 * Map key for a legacy URL: the percent-decoded, NFC path, plus `?id=N` when
 * present. Other query parameters, such as campaign tags, are ignored.
 * Clients encode the same path differently, so the key compares decoded text.
 */
export function legacyKey(pathname: string, searchParams: URLSearchParams): string {
  let path: string

  try {
    path = decodeURIComponent(pathname).normalize('NFC')
  } catch {
    path = pathname
  }

  const id = searchParams.get('id')

  return id && LEGACY_ID.test(id) ? `${path}?id=${id}` : path
}

/** Shard file name for a key: the first byte of its SHA-256, so 256 shards. */
export function legacyShard(key: string): string {
  return `${createHash('sha256').update(key).digest('hex').slice(0, 2)}.json`
}
