import {
  PortableText as PortableTextRenderer,
  type PortableTextComponents,
  type PortableTextProps,
} from 'next-sanity'

import { Media } from '@/components/ui/Media'
import { safeHref } from '@/lib/links'
import { toImage } from '@/sanity/image'

const components = (imageSizes: string): PortableTextComponents => ({
  types: {
    // Full column width at the image's own aspect, nothing cropped.
    image: ({ value }) => {
      const image = toImage(value)

      return image ? <Media image={image} sizes={imageSizes} natural /> : null
    },
  },
  marks: {
    // The default link mark renders any stored href, javascript: included. Unsafe hrefs render as plain text.
    link: ({ value, children }) => {
      const href = safeHref(value?.href)

      if (!href) {
        return <>{children}</>
      }

      return value?.openInNewTab === true ? (
        <a href={href} target="_blank" rel="noopener noreferrer">
          {children}
        </a>
      ) : (
        <a href={href}>{children}</a>
      )
    },
  },
})

/** `imageSizes` is the `sizes` of the body images: an upper bound of the text column's width. */
export function PortableText({ value, imageSizes }: { value: PortableTextProps['value']; imageSizes: string }) {
  return <PortableTextRenderer value={value} components={components(imageSizes)} />
}
