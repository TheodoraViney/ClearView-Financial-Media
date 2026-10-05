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

const PUBLICATIONS = /* groq */ `
  heading[]{ _key, style, children[]{ _key, text } },
  body,
  cards[]{
    _key,
    brand,
    description,
    image{ ${IMAGE} }
  }
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
  _type == "publications" => { ${PUBLICATIONS} },
  _type == "cta" => { ${CTA} }
`

// What the adapter needs to build an item's title and meta line. Shared records carry no brand.
const HIGHLIGHT_ITEM = /* groq */ `
  _id,
  _type,
  "slug": slug.current,
  title,
  category,
  nominationsClosingDate,
  startDate,
  endDate,
  country,
  publishedAt
`

// Picks first; `fill` holds the records for the empty places, in tiers, so a block shows three items whenever records exist.
// Each tier is its own sub-query (`[0...3]`, picks excluded; `^` is the highlights block), concatenated in tier order
// with an array spread `...` (not an object spread); the tier conditions are disjoint, and the adapter dedupes against the picks and keeps the first three.
// `tier` tells the adapter which meta line to show. Shared records have no brand field. `$today` is the UK calendar date
// passed in by the page, so the cached result changes once a day instead of `now()` defeating the cache.
// The fill runs on ClearView only: the brand sites show editor picks only and never run the fill queries.
// GROQ comparisons with null are null, and `!null` is null too, so "not open" is spelt `!(defined(x) && x >= $today)`.
// Research runs newest first; GROQ sorts null first in desc, so an undated resource is pushed to the end.
// Research also skips the report the promo row already shows.
const HIGHLIGHTS = /* groq */ `
  source,
  heading[]{ _key, style, children[]{ _key, text } },
  "items": items[]->{ ${HIGHLIGHT_ITEM} },
  "fill": select(
    $brand == "clearview" && source == "awards" => [
      ...*[
        _type == "awardsProgramme"
        && nominationsClosingDate >= $today
        && !(_id in ^.items[]._ref)
      ] | order(nominationsClosingDate asc)[0...3]{ "tier": "open", ${HIGHLIGHT_ITEM} },
      ...*[
        _type == "awardsProgramme"
        && !(defined(nominationsClosingDate) && nominationsClosingDate >= $today)
        && startDate >= $today
        && !(_id in ^.items[]._ref)
      ] | order(startDate asc)[0...3]{ "tier": "ahead", ${HIGHLIGHT_ITEM} },
      ...*[
        _type == "awardsProgramme"
        && !(defined(nominationsClosingDate) && nominationsClosingDate >= $today)
        && startDate < $today
        && !(_id in ^.items[]._ref)
      ] | order(startDate desc)[0...3]{ "tier": "past", ${HIGHLIGHT_ITEM} }
    ],
    $brand == "clearview" && source == "events" => [
      ...*[
        _type == "conferenceEvent"
        && coalesce(endDate, startDate) >= $today
        && !(_id in ^.items[]._ref)
      ] | order(startDate asc)[0...3]{ "tier": "ahead", ${HIGHLIGHT_ITEM} },
      ...*[
        _type == "conferenceEvent"
        && coalesce(endDate, startDate) < $today
        && !(_id in ^.items[]._ref)
      ] | order(startDate desc)[0...3]{ "tier": "past", ${HIGHLIGHT_ITEM} }
    ],
    $brand == "clearview" && source == "research" => *[
      _type == "resource"
      && category == "research"
      && !(_id in ^.items[]._ref)
      && _id != coalesce(^.promo.resource._ref, "")
    ] | order(defined(publishedAt) desc, publishedAt desc, legacyWpId desc)[0...3]{ "tier": "latest", ${HIGHLIGHT_ITEM} }
  ),
  button{ ${LINK} },
  promo{
    resource->{
      title,
      "downloadThumbnail": downloadThumbnail{ ${IMAGE} },
      "downloadFileUrl": downloadFile.asset->url,
      "downloadFileName": downloadFile.asset->originalFilename,
      downloadUrl
    },
    title,
    description,
    "image": image{ ${IMAGE} },
    link{ ${LINK} }
  }
`

const ASIDE_BLOCKS = /* groq */ `
  _type == "highlights" => { ${HIGHLIGHTS} },
  _type == "adSlot" => { ${AD_SLOT} }
`

/** One member of a page's `blocks[]`. Use as `blocks[]{ _key, _type, ${BLOCKS_PROJECTION} }`. */
export const BLOCKS_PROJECTION = /* groq */ `
  _type == "adSlot" => { ${AD_SLOT} },
  _type == "topStories" => { ${TOP_STORIES} },
  _type == "publications" => { ${PUBLICATIONS} },
  _type == "cta" => { ${CTA} },
  _type == "highlights" => { ${HIGHLIGHTS} },
  _type == "splitLayout" => {
    "main": main[]{ _key, _type, ${MAIN_COLUMN_BLOCKS} },
    "aside": aside[]{ _key, _type, ${ASIDE_BLOCKS} }
  }
`
