import {
  PortableText as PortableTextRenderer,
  type PortableTextComponents,
  type PortableTextProps,
} from 'next-sanity'

import { Media, type MediaSlot } from '@/components/ui/Media'
import { safeHref } from '@/lib/links'
import { toImage } from '@/sanity/image'

const components = (imageSlot: MediaSlot): PortableTextComponents => ({
  types: {
    // Full column width at the image's own aspect, nothing cropped.
    image: ({ value }) => {
      const image = toImage(value)

      return image ? <Media image={image} slot={imageSlot} natural /> : null
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

/** `imageSlot` is the text column's width per breakpoint, for the body images' `sizes`. */
export function PortableText({ value, imageSlot }: { value: PortableTextProps['value']; imageSlot: MediaSlot }) {
  return <PortableTextRenderer value={value} components={components(imageSlot)} />
}
