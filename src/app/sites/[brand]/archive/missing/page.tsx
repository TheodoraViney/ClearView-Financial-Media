import { notFound } from 'next/navigation'

// The proxy rewrites here a URL it already knows has no page: an archive URL with no article (src/lib/archive.ts,
// archiveRequest) or an Executive Summary that does not exist (src/sanity/summary-route.ts). With nothing to wait for,
// notFound() runs before the layout streams, so the brand's Page not found goes out with a real 404 status.
export default function Missing(): never {
  notFound()
}
