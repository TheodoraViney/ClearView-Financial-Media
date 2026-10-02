// GROQ projection fragments shared by the queries in ./queries.ts.
// Explicit fields only, never `...`: a spread leaks every stored field, drafts-only data included, into the page payload.

/** An image object: the asset reference for urlFor, the editor's crop and hotspot, and alt text. */
export const IMAGE = /* groq */ `
  asset,
  hotspot,
  crop,
  alt
`

/** A linkField value. `internal` is dereferenced to what resolveHref needs and nothing more. */
export const LINK = /* groq */ `
  kind,
  label,
  external,
  internal->{
    _type,
    "slug": slug.current,
    brand,
    brands
  }
`

/** A post as a card in a listing. */
export const POST_CARD = /* groq */ `
  _id,
  title,
  "slug": slug.current,
  brands,
  publishedAt,
  excerpt,
  "image": image{ ${IMAGE} }
`

const CTA = /* groq */ `
  heading,
  text,
  link{ label, href }
`

// Picks first; `latest` fills the remaining places. `^` is the topStories block, so picks are excluded.
// On ClearView every editorial post qualifies: post.brands never holds the clearview key.
const TOP_STORIES = /* groq */ `
  "slides": slides[]->{ ${POST_CARD} },
  "articles": articles[]->{ ${POST_CARD} },
  "latest": *[
    _type == "post"
    && defined(slug.current)
    && ($brand == "clearview" || $brand in brands)
    && !(_id in ^.slides[]._ref)
    && !(_id in ^.articles[]._ref)
  ] | order(publishedAt desc)[0...6]{ ${POST_CARD} }
`

const AD_SLOT = /* groq */ `
  size,
  label,
  spacing
`

// adminLabel is CMS-only and deliberately not projected.
const MAIN_COLUMN_BLOCKS = /* groq */ `
  _type == "adSlot" => { ${AD_SLOT} },
  _type == "topStories" => { ${TOP_STORIES} },
  _type == "cta" => { ${CTA} }
`

const ASIDE_BLOCKS = /* groq */ `
  _type == "adSlot" => { ${AD_SLOT} }
`

/** One member of a page's `blocks[]`. Use as `blocks[]{ _key, _type, ${BLOCKS_PROJECTION} }`. */
export const BLOCKS_PROJECTION = /* groq */ `
  _type == "adSlot" => { ${AD_SLOT} },
  _type == "topStories" => { ${TOP_STORIES} },
  _type == "cta" => { ${CTA} },
  _type == "splitLayout" => {
    "main": main[]{ _key, _type, ${MAIN_COLUMN_BLOCKS} },
    "aside": aside[]{ _key, _type, ${ASIDE_BLOCKS} }
  }
`
