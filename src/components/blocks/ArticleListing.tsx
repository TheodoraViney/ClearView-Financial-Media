import { ArticleListing as ArticleListingSection } from '@/components/sections/categories/ArticleListing'
import { toArticleListingView, type ArticleListingContext } from '@/sanity/categories-view'

import type { BlockProps } from './types'

/**
 * The Categories page's articles list. Its posts, filter options and URL state come from the Categories route
 * (`articles`); the route answers a page past the end with a 404 before rendering.
 */
export function ArticleListing({ block, articles }: BlockProps<'articleListing'> & { articles: ArticleListingContext }) {
  return <ArticleListingSection view={toArticleListingView(block, articles)} />
}
