import { archiveSlugShard } from '@/lib/archive-slugs'

/**
 * Looks up an archived article's slug in `data/archive-slugs/`. The shards are
 * imported, so the bundler ships each one as its own chunk with the proxy and
 * loads it on first use; file tracing does not reach the proxy.
 */

// Shards never change within a deployment. Kept per instance, so repeat hits skip the load.
const shards = new Map<string, Promise<Record<string, string>>>()

function loadShard(name: string): Promise<Record<string, string>> {
  let shard = shards.get(name)

  if (!shard) {
    shard = import(`../../data/archive-slugs/${name}`).then((module: { default: Record<string, string> }) => module.default)
    // A failed load is retried on the next request rather than cached.
    shard.catch(() => shards.delete(name))
    shards.set(name, shard)
  }

  return shard
}

/** The slug of an archived article, or null when the archive has no article with this id. */
export async function archiveSlug(id: number): Promise<string | null> {
  return (await loadShard(archiveSlugShard(id)))[id] ?? null
}
