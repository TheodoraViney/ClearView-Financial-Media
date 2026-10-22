import type { NextConfig } from 'next'
import { sanity } from 'next-sanity/live/cache-life'

const nextConfig: NextConfig = {
  cacheComponents: true,
  // The legacy redirect handler reads its map shards from disk, so they must ship with its function.
  outputFileTracingIncludes: {
    '/sites/\\[brand\\]/legacy-article': ['./data/legacy-redirects/*.json'],
    '/sites/\\[brand\\]/archive/sitemap/\\[file\\]': ['./data/archive-sitemap/**/*.json'],
  },
  cacheLife: {
    default: sanity,
  },
  images: {
    // Sanity's CDN resizes and encodes; the Next.js optimizer is never used (no double encode). See the loader file.
    loader: 'custom',
    loaderFile: './src/sanity/image-loader.ts',
    // Must match IMAGE_QUALITY in the loader file.
    qualities: [80],
    // Next's defaults plus 2304 and 2560, so a 2x wide slot gets a step close to its need instead of a near-original.
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 2304, 2560, 3840],
  },
  async rewrites() {
    const archiveOrigin = process.env.ARCHIVE_ORIGIN?.replace(/\/+$/, '')

    // Images and files of archived articles, which the records reference as /archive-media/..., come from the
    // archive Worker on every brand host. The proxy skips this prefix, so the path is never brand-rewritten.
    return archiveOrigin
      ? [{ source: '/archive-media/:path*', destination: `${archiveOrigin}/media/:path*` }]
      : []
  },
}

export default nextConfig
