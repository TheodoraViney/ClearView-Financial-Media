// GROQ projection fragments shared by the queries in ./queries.ts.
// Explicit fields only, never `...`: a spread leaks every stored field, drafts-only data included, into the page payload.

/** An image object: the asset reference for urlFor, the editor's crop and hotspot, and alt text. */
export const IMAGE = /* groq */ `
  asset,
  hotspot,
  crop,
  alt
`

/** A linkField value without its label (`withLabel: false`). `internal` is dereferenced to what resolveHref needs and nothing more. */
export const LINK_TARGET = /* groq */ `
  kind,
  external,
  internal->{
    _type,
    "slug": slug.current,
    brand,
    brands
  }
`

/** A linkField value with its label. */
export const LINK = /* groq */ `
  label,
  ${LINK_TARGET}
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
// The Studio unsets an emptied array, and `_id in null` is null, which would drop every post: hence the coalesce.
// On ClearView every editorial post qualifies: post.brands never holds the clearview key.
const TOP_STORIES = /* groq */ `
  linkLabel,
  "slides": slides[]->{ ${POST_CARD} },
  "articles": articles[]->{ ${POST_CARD} },
  "latest": *[
    _type == "post"
    && defined(slug.current)
    && ($brand == "clearview" || $brand in brands)
    && !(_id in coalesce(^.slides[]._ref, []))
    && !(_id in coalesce(^.articles[]._ref, []))
  ] | order(publishedAt desc)[0...6]{ ${POST_CARD} }
`

const PUBLICATIONS = /* groq */ `
  heading[]{ _key, style, children[]{ _key, text } },
  body,
  cards[]{
    _key,
    brand,
    description,
    image{ ${IMAGE} },
    linkLabel
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
// The tiers only order the fill; the adapter picks the meta line from the record's own dates. Shared records have no brand field.
// `$today` is the UK calendar date passed in by the page, so the cached result changes once a day instead of `now()` defeating the cache.
// The fill runs on ClearView only: the brand sites show editor picks only and never run the fill queries.
// GROQ comparisons with null are null, and `!null` is null too, so "not open" is spelt `!(defined(x) && x >= $today)`.
// For the same reason the picks are coalesced: the Studio unsets `items` when the last pick is removed.
// Research runs newest first; GROQ sorts null first in desc, so an undated resource is pushed to the end.
// Research also skips the report the promo row already shows.
const HIGHLIGHTS = /* groq */ `
  source,
  heading[]{ _key, style, children[]{ _key, text } },
  deadlineLabel,
  "items": items[]->{ ${HIGHLIGHT_ITEM} },
  "fill": select(
    $brand == "clearview" && source == "awards" => [
      ...*[
        _type == "awardsProgramme"
        && nominationsClosingDate >= $today
        && !(_id in coalesce(^.items[]._ref, []))
      ] | order(nominationsClosingDate asc)[0...3]{ ${HIGHLIGHT_ITEM} },
      ...*[
        _type == "awardsProgramme"
        && !(defined(nominationsClosingDate) && nominationsClosingDate >= $today)
        && startDate >= $today
        && !(_id in coalesce(^.items[]._ref, []))
      ] | order(startDate asc)[0...3]{ ${HIGHLIGHT_ITEM} },
      ...*[
        _type == "awardsProgramme"
        && !(defined(nominationsClosingDate) && nominationsClosingDate >= $today)
        && startDate < $today
        && !(_id in coalesce(^.items[]._ref, []))
      ] | order(startDate desc)[0...3]{ ${HIGHLIGHT_ITEM} }
    ],
    $brand == "clearview" && source == "events" => [
      ...*[
        _type == "conferenceEvent"
        && coalesce(endDate, startDate) >= $today
        && !(_id in coalesce(^.items[]._ref, []))
      ] | order(startDate asc)[0...3]{ ${HIGHLIGHT_ITEM} },
      ...*[
        _type == "conferenceEvent"
        && coalesce(endDate, startDate) < $today
        && !(_id in coalesce(^.items[]._ref, []))
      ] | order(startDate desc)[0...3]{ ${HIGHLIGHT_ITEM} }
    ],
    $brand == "clearview" && source == "research" => *[
      _type == "resource"
      && category == "research"
      && !(_id in coalesce(^.items[]._ref, []))
      && _id != coalesce(^.promo.resource._ref, "")
    ] | order(defined(publishedAt) desc, publishedAt desc, legacyWpId desc)[0...3]{ ${HIGHLIGHT_ITEM} }
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
    link{ ${LINK_TARGET} }
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
