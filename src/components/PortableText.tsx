import Image from 'next/image'
import {
  PortableText as PortableTextRenderer,
  type PortableTextComponents,
  type PortableTextProps,
} from 'next-sanity'

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
}

export function PortableText({ value }: { value: PortableTextProps['value'] }) {
  return <PortableTextRenderer value={value} components={components} />
}
