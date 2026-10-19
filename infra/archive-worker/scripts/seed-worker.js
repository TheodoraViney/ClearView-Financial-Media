/**
 * Local-only loader for seed-local.mjs. It runs under `wrangler dev` against
 * the same persisted R2 state as the archive Worker and accepts a batch of
 * objects per request:
 *
 *   [u32 big-endian index length][JSON index][object bytes, back to back]
 *
 * The index is `[{ key, contentType, size }]` in body order. Batching keeps
 * the number of local connections low; one connection per object exhausts
 * macOS loopback ports long before 100k objects.
 */
export default {
  async fetch(request, env) {
    // Writes only under `wrangler dev`: deployed by mistake, it would be an open write endpoint to the bucket.
    if (!['localhost', '127.0.0.1'].includes(new URL(request.url).hostname)) {
      return new Response('Forbidden\n', { status: 403 })
    }

    if (request.method !== 'POST') {
      return new Response('ok\n')
    }

    const bytes = new Uint8Array(await request.arrayBuffer())
    const indexLength = new DataView(bytes.buffer).getUint32(0)
    const index = JSON.parse(new TextDecoder().decode(bytes.subarray(4, 4 + indexLength)))
    let offset = 4 + indexLength

    const puts = index.map(({ key, contentType, size }) => {
      const body = bytes.subarray(offset, offset + size)
      offset += size

      return env.ARCHIVE.put(key, body, { httpMetadata: { contentType } })
    })

    await Promise.all(puts)

    return Response.json({ written: index.length })
  },
}
