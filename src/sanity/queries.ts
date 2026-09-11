import { defineQuery } from 'next-sanity'

export const BRAND_QUERY = defineQuery(`
  *[_type == "brand" && _id == $brandId][0]{
    _id,
    title,
    key,
    domain,
    region,
    logo,
    brandColor
  }
`)

export const HOME_PAGE_QUERY = defineQuery(`
  *[_type == "page" && brand == $brand && slug.current == "home"][0]{
    _id,
    title,
    blocks
  }
`)

export const PAGE_QUERY = defineQuery(`
  *[_type == "page" && slug.current == $slug && brand == $brand][0]{
    _id,
    title,
    blocks
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
