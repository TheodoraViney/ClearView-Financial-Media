/**
 * Every archived article's slug by id, so the proxy can answer a missing
 * article with a 404 and a wrong slug with a 308 before the page streams.
 * A streamed page has already sent its 200 by the time it finds out.
 *
 * `scripts/build-archive-slugs.mjs` writes `data/archive-slugs/{shard}.json`
 * from the export records, each shard an object `{ [id]: slug }`. Keep this
 * file free of `@/` imports: the script loads it directly with Node.
 */

export const ARCHIVE_SLUGS_DIR = 'data/archive-slugs'

/** Shard file name for an id: the id modulo 256, as two hex digits. */
export function archiveSlugShard(id: number): string {
  return `${(id % 256).toString(16).padStart(2, '0')}.json`
}
