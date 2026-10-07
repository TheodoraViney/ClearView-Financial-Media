import { defineQuery } from 'next-sanity'

import { BLOCKS_PROJECTION, LINK, LINK_TARGET } from './fragments'

// The site shell: the brand's header document and its Brand settings. Both ids derive from $brand
// (headerDocumentId / brandDocumentId), and the Brand settings match is also checked against $brand.
// navLink stores its visible text in `label`, so its link has no label of its own (LINK_TARGET).
// brandColor feeds the layout's --brand-color until brand colours move to tokens.
export const HEADER_QUERY = defineQuery(`
  {
    "header": *[_id == $headerId && _type in ["clearviewHeader", "publicationHeader"]][0]{
      _type,
      navigation[]{
        _key,
        _type,
        label,
        link{ ${LINK_TARGET} },
        links[]{ _key, _type, label, link{ ${LINK_TARGET} } }
      },
      searchPlaceholder,
      subscribe{ ${LINK} }
    },
    "brand": *[_type == "brand" && _id == $brandId && key.current == $brand][0]{
      title,
      brandColor,
      logo{ asset->{ url, metadata{ dimensions{ width, height } } } }
    }
  }
`)

export const HOME_PAGE_QUERY = defineQuery(`
  *[_type == "page" && brand == $brand && slug.current == "home"][0]{
    _id,
    title,
    blocks[]{ _key, _type, ${BLOCKS_PROJECTION} }
  }
`)

export const PAGE_QUERY = defineQuery(`
  *[_type == "page" && slug.current == $slug && brand == $brand][0]{
    _id,
    title,
    blocks[]{ _key, _type, ${BLOCKS_PROJECTION} }
  }
`)

export const PAGE_SLUGS_QUERY = defineQuery(`
  *[_type == "page" && brand == $brand && defined(slug.current) && slug.current != "home"]{
    "slug": slug.current
  }
`)

export const POSTS_QUERY = defineQuery(`
  *[_type == "post" && $brand in brands] | order(publishedAt desc){
    _id,
    title,
    "slug": slug.current,
    publishedAt,
    excerpt,
    image
  }
`)

export const POST_QUERY = defineQuery(`
  *[_type == "post" && slug.current == $slug && $brand in brands][0]{
    _id,
    title,
    publishedAt,
    excerpt,
    image,
    content
  }
`)

export const POST_SLUGS_QUERY = defineQuery(`
  *[_type == "post" && defined(slug.current) && $brand in brands]{
    "slug": slug.current
  }
`)
