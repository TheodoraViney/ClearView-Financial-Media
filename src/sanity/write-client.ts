import 'server-only'

import { client } from './client'

/**
 * Sanity client with the write token, for server routes that change documents. Raw perspective (published and
 * drafts side by side, by their real ids), no CDN, no stega. Created on call, so a missing token fails only the
 * request that needs it.
 */
export function writeClient() {
  const token = process.env.SANITY_API_WRITE_TOKEN

  if (!token) {
    throw new Error('Missing environment variable: SANITY_API_WRITE_TOKEN')
  }

  return client.withConfig({ token, useCdn: false, perspective: 'raw', stega: false })
}
