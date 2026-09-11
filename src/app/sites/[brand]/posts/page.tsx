import Link from 'next/link'
import { draftMode } from 'next/headers'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'

import { isBrandKey, type BrandKey } from '@/brands'
import {
  cachedSanity,
  getDynamicFetchOptions,
  type DynamicFetchOptions,
} from '@/sanity/live'
import { POSTS_QUERY } from '@/sanity/queries'

export default async function PostsPage({
  params,
}: {
  params: Promise<{ brand: string }>
}) {
  const { brand } = await params

  if (!isBrandKey(brand)) {
    notFound()
  }

  const { isEnabled: isDraftMode } = await draftMode()

  if (isDraftMode) {
    return (
      <Suspense fallback={null}>
        <DynamicPosts brand={brand} />
      </Suspense>
    )
  }

  return <CachedPosts brand={brand} perspective="published" stega={false} />
}

async function DynamicPosts({ brand }: { brand: BrandKey }) {
  const { perspective, variant, stega } = await getDynamicFetchOptions()

  return (
    <CachedPosts
      brand={brand}
      perspective={perspective}
      variant={variant}
      stega={stega}
    />
  )
}

async function CachedPosts({
  brand,
  perspective,
  variant,
  stega,
}: { brand: BrandKey } & DynamicFetchOptions) {
  const { data } = await cachedSanity({
    query: POSTS_QUERY,
    params: { brand },
    perspective,
    variant,
    stega,
  })

  return (
    <main className="px-6 py-10">
      <h1 className="text-3xl font-semibold">Posts</h1>
      <ul className="mt-6 flex flex-col gap-4">
        {data.map((post) => (
          <li key={post._id}>
            {post.slug ? (
              <Link href={`/posts/${post.slug}`} className="text-lg underline">
                {post.title}
              </Link>
            ) : (
              <span className="text-lg">{post.title}</span>
            )}
            {post.excerpt && <p>{post.excerpt}</p>}
          </li>
        ))}
      </ul>
    </main>
  )
}
