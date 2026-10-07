import Link from 'next/link'

import { cx } from '@/components/ui/cx'

import type { HeaderLogo as HeaderLogoProps } from './types'

/** The brand logo as the home link. Its accessible name is the brand title, from the image alt. */
export function HeaderLogo({
  logo,
  homeHref,
  className,
}: {
  logo: HeaderLogoProps | null
  homeHref: string
  // Sizes the image; the layouts set height or width per breakpoint and the other side stays auto.
  className?: string
}) {
  if (!logo) {
    return null
  }

  return (
    <Link href={homeHref} className="block shrink-0">
      {/* An SVG from the CMS, served as is: next/image would need dangerouslyAllowSVG for it. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={logo.src}
        width={logo.width}
        height={logo.height}
        alt={logo.alt}
        className={cx('block', className)}
      />
    </Link>
  )
}
