export const PLACEHOLDER_SLUG = '__placeholder__'

// Cache Components rejects an empty generateStaticParams, so an unseeded dataset needs one throwaway path that the page 404s.
export function withPlaceholder(slugs: { slug: string }[]): { slug: string }[] {
  return slugs.length > 0 ? slugs : [{ slug: PLACEHOLDER_SLUG }]
}
