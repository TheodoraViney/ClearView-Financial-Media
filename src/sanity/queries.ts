import { defineQuery } from 'next-sanity'

import {
  ADVERTISING,
  ARTICLE_BODY,
  ARTICLE_CARD,
  BLOCKS_PROJECTION,
  IMAGE,
  LINK,
  LINK_TARGET,
  LISTING_CARD,
  SUBSCRIBE_MODAL,
} from './fragments'

// The site shell: the brand's header and footer documents, its Brand settings and its subscribe pop-up, in one round
// trip. Those ids derive from $brand (headerDocumentId / footerDocumentId / brandDocumentId /
// subscribeModalDocumentId), and the Brand settings match is also checked against $brand.
// navLink stores its visible text in `label`, so its link has no label of its own (LINK_TARGET).
// The brand's ad unit codes ride along, so a page reads them from the layout's cache entry (fetchShell).
export const SHELL_QUERY = defineQuery(`
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
      searchLabels,
      subscribeLabel,
      subscribe{ ${LINK} }
    },
    "footer": *[_id == $footerId && _type in ["clearviewFooter", "publicationFooter"]][0]{
      _type,
      description,
      publisherLine,
      columns[]{
        _key,
        title,
        links[]{ _key, label, link{ ${LINK_TARGET} } }
      },
      socialHeading,
      social[]{ _key, name, url, icon{ asset->{ url } } },
      copyright
    },
    "brand": *[_type == "brand" && _id == $brandId && key.current == $brand][0]{
      title,
      logo{ "alt": asset->altText, asset->{ url, metadata{ dimensions{ width, height } } } },
      footerLogo{ "alt": asset->altText, asset->{ url, metadata{ dimensions{ width, height } } } },
      ${ADVERTISING}
    },
    "subscribeModal": *[_id == $subscribeModalId && _type == "subscribeModal"][0]{ ${SUBSCRIBE_MODAL} }
  }
`)

// The home page's three block lists, rendered around Banner 3 and Banner 4.
export const HOME_PAGE_QUERY = defineQuery(`
  *[_type == "page" && brand == $brand && slug.current == "home"][0]{
    _id,
    title,
    blocks[]{ _key, _type, ${BLOCKS_PROJECTION} },
    blocksMiddle[]{ _key, _type, ${BLOCKS_PROJECTION} },
    blocksBottom[]{ _key, _type, ${BLOCKS_PROJECTION} }
  }
`)

export const PAGE_QUERY = defineQuery(`
  *[_type == "page" && slug.current == $slug && brand == $brand][0]{
    _id,
    title,
    blocks[]{ _key, _type, ${BLOCKS_PROJECTION} }
  }
`)

// The home page and the Categories page have routes of their own (src/app/sites/[brand]/categories).
export const PAGE_SLUGS_QUERY = defineQuery(`
  *[_type == "page" && brand == $brand && defined(slug.current) && !(slug.current in ["home", "categories"])]{
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

// The article page.
// The body is two Portable Text fields, the text before and after the article banner (ARTICLE_BODY).
// Recommended: the editor's picks on this brand (`picks`, reordered by `recommendedIds` in the adapter), then the latest
// posts of the same category (`fill`) for the empty places. The Studio unsets an emptied array, hence the coalesce.
export const POST_QUERY = defineQuery(`
  *[_type == "post" && slug.current == $slug && $brand in brands][0]{
    _id,
    title,
    "slug": slug.current,
    brands,
    publishedAt,
    excerpt,
    "image": image{ ${IMAGE}, credit },
    "category": category->{ title, "slug": slug.current },
    "primaryTopic": primaryTopic->{ title, "slug": slug.current },
    "secondaryTopics": secondaryTopics[]->{ title, "slug": slug.current },
    "region": region->{ title, "slug": slug.current },
    "author": author->{ name, jobTitle, city, bio, "photo": photo{ ${IMAGE} } },
    content[]{ ${ARTICLE_BODY} },
    contentAfter[]{ ${ARTICLE_BODY} },
    "recommendedIds": coalesce(recommended[]._ref, []),
    "picks": *[
      _type == "post"
      && _id in coalesce(^.recommended[]._ref, [])
      && _id != ^._id
      && $brand in brands
      && defined(slug.current)
    ]{ ${ARTICLE_CARD} },
    "fill": *[
      _type == "post"
      && $brand in brands
      && defined(slug.current)
      && defined(^.category._ref)
      && category._ref == ^.category._ref
      && _id != ^._id
      && !(_id in coalesce(^.recommended[]._ref, []))
    ] | order(publishedAt desc)[0...3]{ ${ARTICLE_CARD} }
  }
`)

// The brand's article page labels and share rail networks (`$id` from articlePageDocumentId). Missing until seeded:
// the page falls back to the design texts in src/lib/article-copy.ts and shows only the copy link button.
export const ARTICLE_PAGE_QUERY = defineQuery(`
  *[_type == "articlePage" && _id == $id][0]{
    recommendedHeading,
    breadcrumbHomeLabel,
    shareLabel,
    copyLinkLabel,
    linkCopiedLabel,
    readTimeSuffix,
    imageCreditPrefix,
    shareRailLabel,
    "shareLinks": coalesce(shareLinks[]{ _key, label, url, icon{ asset->{ url } } }, [])
  }
`)

// The brand's Most read picks (`$id` from mostReadDocumentId), 0 to 5. A filter, not `->`, so only posts of this
// brand resolve; the adapter restores the editor's order from `ids`. The Studio unsets an emptied array, hence the
// coalesce. The places left empty come from the auto source (src/sanity/most-read.ts).
export const MOST_READ_QUERY = defineQuery(`
  *[_type == "mostRead" && _id == $id][0]{
    title,
    "ids": coalesce(posts[]._ref, []),
    "posts": *[
      _type == "post"
      && _id in coalesce(^.posts[]._ref, [])
      && $brand in brands
      && defined(slug.current)
    ]{ ${ARTICLE_CARD} }
  }
`)

// Most read's auto source for now: the brand's latest posts, the article being read left out by `$slug`. `$limit`
// covers a full list after the adapter drops the editor's picks from it.
export const MOST_READ_LATEST_QUERY = defineQuery(`
  *[
    _type == "post"
    && $brand in brands
    && defined(slug.current)
    && slug.current != $slug
  ] | order(publishedAt desc)[0...$limit]{ ${ARTICLE_CARD} }
`)

// The Categories page (`$id` from categoriesPageDocumentId) and its filter options. Topics and regions are the ones
// with at least one post on this brand, alphabetical; categories are all of them, as links to the list come from
// articles and Related topics. The page resolves URL slugs against these lists, so the list query takes ids only.
// Related topics: the editor's categories and topics in order; unpublished ones dereference to null and drop out.
// The Home breadcrumb label is the article page's (`$articlePageId`).
export const CATEGORIES_PAGE_QUERY = defineQuery(`
  {
    "page": *[_type == "page" && _id == $id && brand == $brand][0]{
      _id,
      title,
      intro,
      listLabels{
        topicsLabel,
        allTopicsLabel,
        regionsLabel,
        allRegionsLabel,
        sortLabel,
        sortLatestLabel,
        sortOldestLabel,
        selectedLabel,
        clearFiltersLabel,
        emptyStateText,
        readArticleLabel,
        previousLabel,
        nextLabel
      },
      relatedTopics{
        heading[]{ _key, style, children[]{ _key, text } },
        "items": items[defined(@->slug.current)]->{ _id, _type, title, "slug": slug.current }
      }
    },
    "homeLabel": *[_type == "articlePage" && _id == $articlePageId][0].breadcrumbHomeLabel,
    "topics": *[
      _type == "topic"
      && defined(slug.current)
      && count(*[
        _type == "post"
        && $brand in brands
        && defined(slug.current)
        && (primaryTopic._ref == ^._id || ^._id in secondaryTopics[]._ref)
      ]) > 0
    ] | order(title asc){ _id, title, "slug": slug.current, description },
    "regions": *[
      _type == "region"
      && defined(slug.current)
      && count(*[_type == "post" && $brand in brands && defined(slug.current) && region._ref == ^._id]) > 0
    ] | order(title asc){ _id, title, "slug": slug.current },
    "categories": *[_type == "category" && defined(slug.current)] | order(title asc){
      _id,
      title,
      "slug": slug.current,
      description
    }
  }
`)

// The Categories page list: the brand's posts matching the filters, and the page's slice of them. Filters are ids
// resolved from the URL by the page, always passed (an empty array or "" means no filter), never built into the query
// string. A topic matches the main or a secondary topic. Two queries because order() takes no parameter; the oldest
// order is the exact reverse of the latest, `_id` breaking ties.
const CATEGORIES_FILTER = /* groq */ `
  _type == "post"
  && $brand in brands
  && defined(slug.current)
  && (count($topicIds) == 0 || primaryTopic._ref in $topicIds || count(secondaryTopics[_ref in $topicIds]) > 0)
  && (count($regionIds) == 0 || region._ref in $regionIds)
  && ($categoryId == "" || category._ref == $categoryId)
`

export const CATEGORIES_LATEST_QUERY = defineQuery(`
  {
    "total": count(*[${CATEGORIES_FILTER}]),
    "items": *[${CATEGORIES_FILTER}] | order(publishedAt desc, _id desc)[$start...$end]{ ${LISTING_CARD} }
  }
`)

export const CATEGORIES_OLDEST_QUERY = defineQuery(`
  {
    "total": count(*[${CATEGORIES_FILTER}]),
    "items": *[${CATEGORIES_FILTER}] | order(publishedAt asc, _id asc)[$start...$end]{ ${LISTING_CARD} }
  }
`)

export const POST_SLUGS_QUERY = defineQuery(`
  *[_type == "post" && defined(slug.current) && $brand in brands]{
    "slug": slug.current
  }
`)

// A newsletter issue as the sending route reads it: both the published document and its draft, through the raw
// perspective with a token (server only). Posts stay references here; NEWSLETTER_EMAIL_QUERY resolves them once the
// route knows which version it sends.
export const NEWSLETTER_ISSUE_VERSIONS_QUERY = defineQuery(`
  *[_type == "newsletterIssue" && _id in [$id, $draftId]]{
    _id,
    _rev,
    brand,
    subject,
    segment{ id, name },
    scheduledAt,
    status,
    brevoCampaignId,
    sendingStartedAt,
    sendRequestedAt,
    "postIds": posts[]._ref
  }
`)

// What the email and the Brevo campaign need: the publication's Brand settings (with the email copy; an unset field
// hides its element) and the issue's posts. Raw ids, so `_id in $postIds` matches published posts only (a draft's id
// carries the `drafts.` prefix), and only posts that are still on the issue's brand. The caller restores the issue's
// order.
export const NEWSLETTER_EMAIL_QUERY = defineQuery(`
  {
    "brand": *[_type == "brand" && _id == $brandId && key.current == $brand][0]{
      title,
      domain,
      logo,
      "senderId": newsletter.sender.id,
      "copy": newsletter.copy{ featuredLabel, readFullStory, readMore, footerText, unsubscribe }
    },
    "posts": *[_type == "post" && _id in $postIds && $brand in brands]{
      _id,
      title,
      excerpt,
      "slug": slug.current,
      publishedAt,
      image
    }
  }
`)

// The issue's versions that hold a given sending lock, with their revisions, so the route releases only its own
// lock and only on the revision it read.
export const NEWSLETTER_ISSUE_LOCK_HOLDERS_QUERY = defineQuery(`
  *[_type == "newsletterIssue" && _id in [$id, $draftId] && sendingStartedAt == $lock]{ _id, _rev }
`)

// Ids of the issue's versions that exist right now, so a result write never patches a draft deleted meanwhile.
export const NEWSLETTER_ISSUE_EXISTING_IDS_QUERY = defineQuery(`
  *[_type == "newsletterIssue" && _id in [$id, $draftId]]._id
`)

// How many of the latest articles a new newsletter issue starts with (Brand settings → Newsletter). Null when unset;
// the caller falls back to DEFAULT_ARTICLES_PER_ISSUE.
export const NEWSLETTER_ARTICLES_PER_ISSUE_QUERY = defineQuery(`
  *[_type == "brand" && _id == $brandId && key.current == $brand][0].newsletter.articlesPerIssue
`)

// The latest published posts of a brand, newest first, whether or not an earlier issue carried them. Run with the
// published perspective, so drafts are never picked. Capped at 20 (the most Brand settings allow); the caller slices
// to its own count.
export const NEWSLETTER_LATEST_POST_IDS_QUERY = defineQuery(`
  *[
    _type == "post"
    && $brand in brands
    && defined(publishedAt)
    && dateTime(publishedAt) <= dateTime(now())
  ] | order(publishedAt desc)[0...20]._id
`)

// The CMS side of the Algolia index (src/lib/search-index.ts): every published post, conference event, awards edition
// and resource with a slug, flattened to what cmsSearchRecord needs. Bodies come as plain text; the record keeps a
// short extract of it.
const SEARCH_RECORD_PROJECTION = `
  _id,
  _type,
  title,
  "slug": slug.current,
  brands,
  excerpt,
  "author": author->name,
  "category": category->title,
  "bodyText": select(
    _type == "post" => pt::text(content),
    _type == "resource" => pt::text(body)
  ),
  publishedAt,
  startDate,
  endDate,
  hideDateTime,
  "region": region->title,
  country,
  eventType,
  "image": select(
    _type == "post" => image{ asset, crop, "alt": coalesce(alt, asset->altText) },
    _type == "resource" => downloadThumbnail{ asset, crop, "alt": coalesce(alt, asset->altText) },
    photographs[defined(asset)][0]{ asset, crop, "alt": coalesce(alt, asset->altText) }
  ),
  "logo": logo{ asset, crop, "alt": coalesce(alt, asset->altText) }
`

export const SEARCH_RECORDS_QUERY = defineQuery(`
  *[_type in ["post", "conferenceEvent", "awardsProgramme", "resource"] && defined(slug.current)]{
    ${SEARCH_RECORD_PROJECTION}
  }
`)

// The same records for a set of ids, for the publish webhook. An id that is not returned was unpublished or deleted.
export const SEARCH_RECORDS_BY_ID_QUERY = defineQuery(`
  *[_id in $ids && _type in ["post", "conferenceEvent", "awardsProgramme", "resource"] && defined(slug.current)]{
    ${SEARCH_RECORD_PROJECTION}
  }
`)

// What POST /api/subscribe checks a signup against, read uncached and published (src/lib/subscribe-server.ts): the
// brand's pop-up interests with their Brevo attributes, and the shared list and confirmation email.
export const SUBSCRIBE_CONFIG_QUERY = defineQuery(`
  {
    "modal": *[_id == $subscribeModalId && _type == "subscribeModal"][0]{
      interests[]{ _key, "attribute": attribute.name, locked }
    },
    "settings": *[_id == $subscribeSettingsId && _type == "subscribeFormSettings"][0]{
      "listId": list.id,
      "templateId": confirmationTemplate.id
    }
  }
`)

// The brand's Search page copy (`$id` from searchPageDocumentId). Every field is required; toSearchPageCopy in
// src/lib/search-page-copy.ts returns null until the document is seeded and complete.
export const SEARCH_PAGE_QUERY = defineQuery(`
  *[_id == $id && _type == "searchPage"][0]{
    title,
    breadcrumbHome,
    breadcrumbCurrent,
    placeholder,
    submitLabel,
    allLabel,
    articlesLabel,
    awardsLabel,
    eventsLabel,
    researchLabel,
    yearLabel,
    allYearsLabel,
    selectedLabel,
    clearFiltersLabel,
    clearAllLabel,
    summaryTemplate,
    typeSuffix,
    resultSingular,
    resultPlural,
    articleType,
    awardType,
    eventType,
    researchType,
    previousLabel,
    nextLabel,
    emptyQueryTitle,
    emptyQueryText,
    noResultsTitle,
    noResultsText,
    newSearchLabel
  }
`)

// Who hears about a confirmed signup (`$id` is SIGNUP_NOTIFICATION_SETTINGS_ID): the team's addresses and the Brevo
// sender the notification comes from. The id is dotted, so this must be fetched with the read token; without one it
// returns null. See src/lib/signup-notification.ts.
export const SIGNUP_NOTIFICATION_SETTINGS_QUERY = defineQuery(`
  *[_id == $id && _type == "signupNotificationSettings"][0]{
    notifyEmails,
    "senderId": notifySender.id
  }
`)

// Every brand's pop-up interests with their labels (`$ids` from subscribeModalDocumentId), so the signup notification
// names an attribute a reader holds from another brand's pop-up too.
export const SIGNUP_INTEREST_LABELS_QUERY = defineQuery(`
  *[_type == "subscribeModal" && _id in $ids]{
    _id,
    interests[]{ label, "attribute": attribute.name }
  }
`)
