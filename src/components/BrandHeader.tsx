import { type SanityImageSource } from '@sanity/image-url'
import Image from 'next/image'
import Link from 'next/link'

import { urlFor } from '@/sanity/image'

export function BrandHeader({
  title,
  logo,
}: {
  title: string
  logo?: SanityImageSource | null
}) {
  return (
    <header
      className="flex items-center justify-between gap-6 border-b-4 px-6 py-4"
      style={{ borderBottomColor: 'var(--brand-color)' }}
    >
      <Link href="/" className="flex items-center gap-3 text-lg font-semibold">
        {logo ? (
          <Image
            src={urlFor(logo).width(320).height(80).fit('max').url()}
            alt={title}
            width={160}
            height={40}
            priority
          />
        ) : (
          title
        )}
      </Link>
      <nav className="flex gap-4">
        <Link href="/">Home</Link>
        <Link href="/posts">Posts</Link>
      </nav>
    </header>
  )
}
