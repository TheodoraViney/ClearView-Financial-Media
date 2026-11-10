// GROQ projection fragments shared by the queries in ./queries.ts.
// Explicit fields only, never `...`: a spread leaks every stored field, drafts-only data included, into the page payload.

/** An image object: the asset reference for toImage, the editor's crop and hotspot, and alt text: the field's own, else the media library's. */
export const IMAGE = /* groq */ `
  asset,
  hotspot,
  crop,
  "alt": coalesce(alt, asset->altText)
`

/**
 * One member of a post's body field (`content`, `contentAfter`): the Portable Text member as stored, plus the image
 * alt fallback and the video file URL. An infographic sends only what the page shows: its generation metadata is
 * left out of the page, though it stays readable to anyone through the public dataset API.
 */
export const ARTICLE_BODY = /* groq */ `
  _type != "infographic" => { ... },
  _type == "infographic" => { _key, _type, eyebrow, title, description, wide, narrow },
  _type == "image" => { "alt": coalesce(alt, asset->altText) },
  _type == "videoFile" => { "url": asset->url, "mimeType": asset->mimeType }
`

/** Brand settings → Advertising: one GAM unit code per position and page type (AD_POSITIONS in src/lib/gam.ts). */
export const ADVERTISING = /* groq */ `
  advertising{
    top{ home, other },
    side{ home, other },
    publications{ home, other },
    article{ other },
    banner3{ home },
    banner4{ home },
    awardsWinners{ home, other }
  }
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

/**
 * The Brand settings titles of a post's brands, so a card's publication label follows a rename in Sanity.
 * `^` is the post. Matched on the key, like the shell query; read with brandTitleIn() in src/sanity/brand-title.ts.
 */
export const BRAND_TITLES = /* groq */ `
  "brandTitles": *[_type == "brand" && key.current in ^.brands]{ "key": key.current, title }
`

/** A post as a card in a listing. The category labels the card on the publication homes ("category | date"). */
export const POST_CARD = /* groq */ `
  _id,
  title,
  "slug": slug.current,
  brands,
  ${BRAND_TITLES},
  publishedAt,
  excerpt,
  "image": image{ ${IMAGE} },
  "category": category->{ title, "slug": slug.current }
`

/**
 * A post as a News in Brief row: the card plus its main topic (the row's label; the category when
 * a post has none) and its brief. An empty brief shows the card's `excerpt` (standfirst) instead.
 */
export const POST_BRIEF = /* groq */ `
  ${POST_CARD},
  "topic": primaryTopic->{ title },
  briefText
`

/**
 * The fill of a post list block: the brand's latest posts for the empty places, picks excluded. `field` is the
 * block's picks array (`^` is the block), `extra` an added condition such as the block's category (`"true"` for none). The slice is a
 * literal maximum; the adapter cuts it to the block's count. The picks are coalesced: the Studio unsets an emptied
 * array, and `_id in null` is null, which would drop every post. Generic with `as const` so a query built with it
 * keeps its literal type: defineQuery() looks the result type up by the exact string.
 */
export const postListFill = <F extends string, M extends number, E extends string>(field: F, max: M, extra: E) =>
  /* groq */ `
  *[
    _type == "post"
    && defined(slug.current)
    && $brand in brands
    && ${extra}
    && !(_id in coalesce(^.${field}[]._ref, []))
  ] | order(publishedAt desc)[0...${max}]
` as const

/** A post as an article page card (Recommended, Most read): its main topic labels it. */
export const ARTICLE_CARD = /* groq */ `
  _id,
  title,
  "slug": slug.current,
  brands,
  publishedAt,
  "image": image{ ${IMAGE} },
  "topic": primaryTopic->{ title, "slug": slug.current }
`

const CTA = /* groq */ `
  heading,
  text,
  link{ label, href }
`

// Pick filters: a picked post shows only while it still runs on the page brand (its brands can change after picking);
// on ClearView every editorial post qualifies, as in its fills. Records of other types (Explore awards, events,
// research) carry no brand and pass. Unpublished or deleted picks dereference to null and drop out here as well.
// Exported for the Studio panel, which dereferences picks the same way.
export const BRAND_POST_PICK = /* groq */ `[$brand in @->brands]`
export const ANY_EDITORIAL_POST_PICK = /* groq */ `[$brand == "clearview" || $brand in @->brands]`
export const BRAND_ITEM_PICK = /* groq */ `[@->_type != "post" || $brand in @->brands]`

// The fill queries below are exported (`*_FILL`) for the Studio "Shown automatically now" panel
// (src/sanity/components/auto-fill-picks-input.tsx), which runs them with the same `$brand` / `$today` and the block as
// `^`, so Studio and site share one source of truth.

// Picks first; `latest` fills the remaining places. `^` is the topStories block, so picks are excluded.
// The Studio unsets an emptied array, and `_id in null` is null, which would drop every post: hence the coalesce.
// On ClearView every editorial post qualifies: post.brands never holds the clearview key.
export const TOP_STORIES_FILL = /* groq */ `*[
    _type == "post"
    && defined(slug.current)
    && ($brand == "clearview" || $brand in brands)
    && !(_id in coalesce(^.slides[]._ref, []))
    && !(_id in coalesce(^.articles[]._ref, []))
  ] | order(publishedAt desc)[0...6]`

// `label` ("Top Stories") shows on the publication homes only; ClearView leaves it unset.
const TOP_STORIES = /* groq */ `
  linkLabel,
  label,
  "slides": slides${ANY_EDITORIAL_POST_PICK}->{ ${POST_CARD} },
  "articles": articles${ANY_EDITORIAL_POST_PICK}->{ ${POST_CARD} },
  "latest": ${TOP_STORIES_FILL}{ ${POST_CARD} }
`

// Exactly four hand-picked posts, no fill. No brand filter here: the block runs on ClearView, where every
// editorial post qualifies (the Studio limits picks to the page's brand), and unpublished or deleted
// picks dereference to null, which the adapter drops.
const FEATURED_STORIES = /* groq */ `
  heading[]{ _key, style, children[]{ _key, text } },
  link{ ${LINK} },
  "posts": posts[]->{ ${POST_CARD} }
`

// One hand-picked post. Dereferenced through a filter rather than `->` so the brand rule applies (every editorial
// brand on ClearView) and a post whose sponsor was removed after picking resolves to null, which renders nothing.
// The company slug builds the "Company Profile" link (/companies/{slug}); the logo is optional.
const SPONSORED_CONTENT = /* groq */ `
  label,
  link{ ${LINK} },
  profileLabel,
  "post": *[
    _type == "post"
    && _id == ^.post._ref
    && defined(slug.current)
    && defined(sponsor)
    && ($brand == "clearview" || $brand in brands)
  ][0]{
    ${POST_CARD},
    "sponsor": sponsor->{
      title,
      "slug": slug.current,
      "logo": logo{ ${IMAGE} }
    }
  }
`

// Editorial figures, not counted from data. The icon is a fixed-list key the adapter validates.
const STATS_BAR = /* groq */ `
  heading[]{ _key, style, children[]{ _key, text } },
  items[]{ _key, icon, value, label }
`

// Every visible string, the validation messages included, comes from the CMS.
// `interestKey`: the brand pop-up's interest with the same Brevo attribute, which a tick on this option pre-ticks in the
// pop-up. The id is subscribeModalDocumentId($brand); the attribute name itself never reaches the page.
const NEWSLETTER_SIGNUP = /* groq */ `
  heading[]{ _key, style, children[]{ _key, text } },
  body,
  preferencesLabel,
  options[]{
    _key,
    label,
    defaultChecked,
    "interestKey": *[_type == "subscribeModal" && _id == "subscribe-modal-" + $brand][0].interests[attribute.name == ^.attribute.name][0]._key
  },
  emailPlaceholder,
  buttonLabel,
  invalidEmailMessage,
  noOptionMessage,
  image{ ${IMAGE} }
`

const PUBLICATIONS = /* groq */ `
  heading[]{ _key, style, children[]{ _key, text } },
  body,
  cards[]{
    _key,
    brand,
    "brandTitle": *[_type == "brand" && key.current == ^.brand][0].title,
    description,
    image{ ${IMAGE} },
    linkLabel
  }
`

// News Analysis and News in Brief: picks, then the brand's latest posts of the block's category.
// Picks dereference through BRAND_POST_PICK: a post taken off the page brand after picking drops out.
const POST_LIST = /* groq */ `
  heading[]{ _key, style, children[]{ _key, text } },
  link{ ${LINK} }
`

/** News Analysis fill: the brand's latest posts of the block's category. */
export const POST_LIST_FILL = postListFill('posts', 6, 'defined(^.category._ref) && category._ref == ^.category._ref')

/** News in Brief fill: the brand's latest posts, any category. */
export const POST_BRIEFS_FILL = postListFill('posts', 6, 'true')

const POST_CARDS = /* groq */ `
  ${POST_LIST},
  "category": category->{ title, "slug": slug.current },
  "posts": posts${BRAND_POST_PICK}->{ ${POST_CARD} },
  "latest": ${POST_LIST_FILL}{ ${POST_CARD} }
` as const

const POST_BRIEFS = /* groq */ `
  ${POST_LIST},
  count,
  "posts": posts${BRAND_POST_PICK}->{ ${POST_BRIEF} },
  "latest": ${POST_BRIEFS_FILL}{ ${POST_BRIEF} }
` as const

/** Weekly Roundup fill: the brand's latest posts. */
export const WEEKLY_ROUNDUP_FILL = postListFill('posts', 8, 'true')

// Static card copy plus four posts: picks, then the brand's latest. The edition date is the last Friday, from `$today` in the adapter.
const WEEKLY_ROUNDUP = /* groq */ `
  heading[]{ _key, style, children[]{ _key, text } },
  label,
  title,
  summary,
  button{ ${LINK} },
  listLabel,
  "posts": posts${BRAND_POST_PICK}->{ ${POST_CARD} },
  "latest": ${WEEKLY_ROUNDUP_FILL}{ ${POST_CARD} }
` as const

// adminLabel is CMS-only and deliberately not projected.
const MAIN_COLUMN_BLOCKS = /* groq */ `
  _type == "topStories" => { ${TOP_STORIES} },
  _type == "sponsoredContent" => { ${SPONSORED_CONTENT} },
  _type == "postCards" => { ${POST_CARDS} },
  _type == "postBriefs" => { ${POST_BRIEFS} },
  _type == "weeklyRoundup" => { ${WEEKLY_ROUNDUP} },
  _type == "publications" => { ${PUBLICATIONS} },
  _type == "cta" => { ${CTA} }
` as const

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

// The fill tiers of the awards, events and research sources, shared by the highlights block and the Explore cards, as
// `select()` branches on the `source` field. `^` is the block or card: its picks (`items`) are excluded.
// Each tier fetches the most a block can show per source (HIGHLIGHTS_ITEM_MAX in the schema: awards 5 `[0...5]`, events 4
// `[0...4]`, research 3 `[0...3]`); the adapter cuts to the block's count.
// Each tier is its own sub-query, concatenated in tier order with an array spread `...` (not an object spread); the tier
// conditions are disjoint, and the adapter dedupes against the picks and keeps the first ones up to the count.
// The tiers only order the fill; the adapter picks the meta line from the record's own dates.
// Shared records have no brand field, so every brand gets the same group-wide lists.
// `$today` is the UK calendar date passed in by the page, so the cached result changes once a day instead of `now()` defeating the cache.
// GROQ comparisons with null are null, and `!null` is null too, so "not open" is spelt `!(defined(x) && x >= $today)`.
// For the same reason the picks are coalesced: the Studio unsets `items` when the last pick is removed.
// Research runs newest first; GROQ sorts null first in desc, so an undated resource is pushed to the end.
// Research also skips the report a highlights promo row already shows (an Explore card has no promo).
export const RECORD_FILL_BRANCHES = /* groq */ `
  source == "awards" => [
    ...*[
      _type == "awardsProgramme"
      && nominationsClosingDate >= $today
      && !(_id in coalesce(^.items[]._ref, []))
    ] | order(nominationsClosingDate asc)[0...5]{ ${HIGHLIGHT_ITEM} },
    ...*[
      _type == "awardsProgramme"
      && !(defined(nominationsClosingDate) && nominationsClosingDate >= $today)
      && startDate >= $today
      && !(_id in coalesce(^.items[]._ref, []))
    ] | order(startDate asc)[0...5]{ ${HIGHLIGHT_ITEM} },
    ...*[
      _type == "awardsProgramme"
      && !(defined(nominationsClosingDate) && nominationsClosingDate >= $today)
      && startDate < $today
      && !(_id in coalesce(^.items[]._ref, []))
    ] | order(startDate desc)[0...5]{ ${HIGHLIGHT_ITEM} }
  ],
  source == "events" => [
    ...*[
      _type == "conferenceEvent"
      && coalesce(endDate, startDate) >= $today
      && !(_id in coalesce(^.items[]._ref, []))
    ] | order(startDate asc)[0...4]{ ${HIGHLIGHT_ITEM} },
    ...*[
      _type == "conferenceEvent"
      && coalesce(endDate, startDate) < $today
      && !(_id in coalesce(^.items[]._ref, []))
    ] | order(startDate desc)[0...4]{ ${HIGHLIGHT_ITEM} }
  ],
  source == "research" => *[
    _type == "resource"
    && category == "research"
    && !(_id in coalesce(^.items[]._ref, []))
    && _id != coalesce(^.promo.resource._ref, "")
  ] | order(defined(publishedAt) desc, publishedAt desc, legacyWpId desc)[0...3]{ ${HIGHLIGHT_ITEM} }
`

// Picks first; `fill` holds the records for the empty places (RECORD_FILL_BRANCHES), on every brand.
// `count` is optional: empty keeps the ClearView counts (HIGHLIGHTS_DEFAULT_COUNT in the schema).
const HIGHLIGHTS = /* groq */ `
  source,
  count,
  heading[]{ _key, style, children[]{ _key, text } },
  deadlineLabel,
  "items": items[]->{ ${HIGHLIGHT_ITEM} },
  "fill": select(${RECORD_FILL_BRANCHES}),
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

// Awards Winners carries only its heading: its banner unit comes from Brand settings.
const ASIDE_BLOCKS = /* groq */ `
  _type == "highlights" => { ${HIGHLIGHTS} },
  _type == "awardsWinners" => { heading[]{ _key, style, children[]{ _key, text } } }
`

// Picks (a sponsor set after picking is flagged, and the adapter drops it), then the brand's newest unsponsored posts:
// the last seven days first, older ones after, so the block stays full while posts exist. `$today` keeps it cacheable.
/** Top Picks fill tiers: unsponsored posts of the last seven days, then older ones. */
export const TOP_PICKS_FILL_RECENT = postListFill(
  'posts',
  6,
  '!defined(sponsor) && dateTime(publishedAt) >= dateTime($today + "T00:00:00Z") - 60*60*24*7',
)
export const TOP_PICKS_FILL_OLDER = postListFill(
  'posts',
  6,
  '!defined(sponsor) && dateTime(publishedAt) < dateTime($today + "T00:00:00Z") - 60*60*24*7',
)

const TOP_PICKS = /* groq */ `
  heading[]{ _key, style, children[]{ _key, text } },
  link{ ${LINK} },
  "posts": posts${BRAND_POST_PICK}->{ ${POST_CARD}, "sponsored": defined(sponsor) },
  "fill": [
    ...${TOP_PICKS_FILL_RECENT}{ ${POST_CARD} },
    ...${TOP_PICKS_FILL_OLDER}{ ${POST_CARD} }
  ]
` as const

// One Explore card: picks, then the fill of its source. `^` is the card. Posts come from the card's category on the
// page brand; awards, events and research run the same tiers as the highlights block (RECORD_FILL_BRANCHES).
const EXPLORE_ITEM = /* groq */ `
  _type == "post" => { _type, ${POST_CARD} },
  _type != "post" => { ${HIGHLIGHT_ITEM} }
`

/** Explore card fill for the posts source: the brand's latest posts of the card's category. */
export const EXPLORE_POSTS_FILL = postListFill('items', 6, 'defined(^.category._ref) && category._ref == ^.category._ref')

const EXPLORE_GRID = /* groq */ `
  cards[]{
    _key,
    heading[]{ _key, style, children[]{ _key, text } },
    icon,
    source,
    count,
    deadlineLabel,
    button{ ${LINK} },
    "items": items${BRAND_ITEM_PICK}->{ ${EXPLORE_ITEM} },
    "fill": select(
      source == "posts" => ${EXPLORE_POSTS_FILL}{ _type, ${POST_CARD} },
      ${RECORD_FILL_BRANCHES}
    )
  }
` as const

const SUBSCRIBE_BANNER = /* groq */ `
  heading[]{ _key, style, children[]{ _key, text } },
  description,
  buttonLabel,
  cta{ ${LINK} }
`

/**
 * A brand's subscribe pop-up: copy, interests without their Brevo attributes, and the privacy link target. The
 * Brevo names never reach the page; the server reads them from the document.
 */
export const SUBSCRIBE_MODAL = /* groq */ `
  title,
  description,
  firstNameLabel,
  lastNameLabel,
  emailLabel,
  emailPlaceholder,
  companyLabel,
  jobTitleLabel,
  countryLabel,
  countryPlaceholder,
  industryLabel,
  industryPlaceholder,
  optionalMarker,
  requiredMarker,
  interestsLegend,
  interests[]{ _key, label, locked, defaultChecked },
  consentText,
  privacyLinkLabel,
  privacyLink{ ${LINK_TARGET} },
  submitLabel,
  firstNameError,
  lastNameError,
  emailMissingError,
  emailInvalidError,
  consentError,
  noPublicationError,
  genericError,
  successTitle,
  successText,
  closeLabel
`

/** One member of a page's `blocks[]`. Use as `blocks[]{ _key, _type, ${BLOCKS_PROJECTION} }`. */
export const BLOCKS_PROJECTION = /* groq */ `
  _type == "topStories" => { ${TOP_STORIES} },
  _type == "publications" => { ${PUBLICATIONS} },
  _type == "cta" => { ${CTA} },
  _type == "highlights" => { ${HIGHLIGHTS} },
  _type == "featuredStories" => { ${FEATURED_STORIES} },
  _type == "statsBar" => { ${STATS_BAR} },
  _type == "newsletterSignup" => { ${NEWSLETTER_SIGNUP} },
  _type == "sponsoredContent" => { ${SPONSORED_CONTENT} },
  _type == "postCards" => { ${POST_CARDS} },
  _type == "postBriefs" => { ${POST_BRIEFS} },
  _type == "weeklyRoundup" => { ${WEEKLY_ROUNDUP} },
  _type == "topPicks" => { ${TOP_PICKS} },
  _type == "exploreGrid" => { ${EXPLORE_GRID} },
  _type == "subscribeBanner" => { ${SUBSCRIBE_BANNER} },
  _type == "splitLayout" => {
    "main": main[]{ _key, _type, ${MAIN_COLUMN_BLOCKS} },
    "aside": aside[]{ _key, _type, ${ASIDE_BLOCKS} }
  }
` as const
