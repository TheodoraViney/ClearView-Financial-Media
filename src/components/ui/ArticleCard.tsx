import Link from 'next/link'
import { type ReactNode } from 'react'

import { cx } from './cx'
import { Media } from './Media'
import { Meta } from './Meta'

// Vertical story card. Desktop uses fixed image heights that alternate (tall), smaller screens use 4:3.
export function ArticleCard({
  href,
  title,
  meta,
  image,
  tall = false,
  className,
}: {
  href: string
  title: string
  meta: ReactNode[]
  image?: string | null
  tall?: boolean
  className?: string
}) {
  return (
    <Link href={href} className={cx('group flex flex-col gap-4 lg:gap-0', className)}>
      <Media
        src={image}
        alt={title}
        ratio="4/3"
        zoom
        sizes="(min-width: 64rem) 25vw, (min-width: 48rem) 50vw, 100vw"
        className={cx('lg:aspect-auto', tall ? 'lg:h-100' : 'lg:h-70')}
      />
      <div
        className={cx(
          'flex flex-col gap-3 pr-2 lg:py-6',
          tall ? 'lg:pr-8' : 'lg:pr-4',
        )}
      >
        <span className="text-title-md font-medium text-pretty text-foreground">
          {title}
        </span>
        <Meta items={meta} />
      </div>
    </Link>
  )
}
