import { isEditorialBrandKey, mostReadDocumentId } from '@/brands'
import { MostRead } from '@/components/sections/MostRead'
import { toMostRead } from '@/sanity/article-view'
import { cachedSanity, type DynamicFetchOptions } from '@/sanity/live'
import { mostReadAutoFill } from '@/sanity/most-read'
import { MOST_READ_QUERY } from '@/sanity/queries'

import type { BlockProps } from './types'

/**
 * Most read in a Two columns sidebar, 300px wide, sticking 32px under the header on desktop. It loads its own list, as
 * the article page does: the brand's Most read document (title and picks), filled with the latest posts, no post
 * left out. ClearView has no posts, so the block renders nothing there (the Studio flags it).
 */
export async function MostReadSidebar({ brand, options }: BlockProps<'mostReadSidebar'> & { options: DynamicFetchOptions }) {
  if (!isEditorialBrandKey(brand)) {
    return null
  }

  const [{ data: mostRead }, fill] = await Promise.all([
    cachedSanity({ query: MOST_READ_QUERY, params: { brand, id: mostReadDocumentId(brand) }, ...options }),
    // No post is being read: an empty slug excludes none.
    mostReadAutoFill({ brand, slug: '', ...options }),
  ])
  const view = toMostRead(null, mostRead, fill, brand)

  return view ? (
    <div className="w-75 max-w-full header:sticky header:top-rail">
      <MostRead title={view.title} items={view.items} />
    </div>
  ) : null
}
