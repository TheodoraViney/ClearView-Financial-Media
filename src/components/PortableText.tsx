import Image from 'next/image'
import {
  PortableText as PortableTextRenderer,
  type PortableTextComponents,
  type PortableTextProps,
} from 'next-sanity'

import { safeHref } from '@/lib/links'
import { urlFor } from '@/sanity/image'

const components: PortableTextComponents = {
  types: {
    image: ({ value }) =>
      value?.asset ? (
        <Image
          src={urlFor(value).width(1600).fit('max').url()}
          alt={value.alt ?? ''}
          width={800}
          height={600}
          className="h-auto w-full"
        />
      ) : null,
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
}

export function PortableText({ value }: { value: PortableTextProps['value'] }) {
  return <PortableTextRenderer value={value} components={components} />
}
