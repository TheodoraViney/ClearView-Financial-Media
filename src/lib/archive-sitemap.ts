/**
 * The archive sitemap: every archived article, listed once, on the domain its
 * canonical tag names (its first publication). The other editorial domains
 * render the article too but leave it out, so search engines see one URL.
 *
 * `scripts/build-archive-sitemap.mjs` writes the data from the export records:
 * `data/archive-sitemap/{brand}/index.json` and one `{n}.json` per sitemap
 * file. Keep this file free of `@/` imports: the script loads it directly
 * with Node.
 */

export const ARCHIVE_SITEMAP_DIR = 'data/archive-sitemap'

/** Articles per sitemap file. Google accepts 50,000; smaller files keep each response quick. */
export const ARCHIVE_SITEMAP_FILE_SIZE = 10_000

/** One article: id, slug, and editorial date ("2020-01-31") or null. */
export type ArchiveSitemapEntry = [id: number, slug: string, date: string | null]

/** One brand's sitemap files, in order, each with its newest article date. */
export type ArchiveSitemapIndex = { files: { lastmod: string | null }[] }
