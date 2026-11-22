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
  OTHER_AWARDS_EDITION,
  OTHER_AWARDS_FILL,
  RELATED_EVENT,
  RELATED_EVENTS_FILL,
  RELATED_RESEARCH,
  RELATED_RESEARCH_FILL,
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
      copyright,
      cookieSettingsLabel
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

// The home page, the Categories page and the shared listings page have routes of their own
// (src/app/sites/[brand]/categories, /events-category and /resource-categories).
export const PAGE_SLUGS_QUERY = defineQuery(`
  *[
    _type == "page"
    && brand == $brand
    && defined(slug.current)
    && !(slug.current in ["home", "categories", "shared-listings"])
  ]{
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
    embedConsentText,
    embedConsentButton,
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

// Most read on a ClearView page (the research report sidebar): ClearView runs no posts of its own, so the latest posts
// of the editorial publications (`$brands`: EDITORIAL_BRAND_KEYS), as the ClearView Top stories fill. mostReadGroupFill
// in most-read.ts is the swap point for a measured source.
export const MOST_READ_GROUP_LATEST_QUERY = defineQuery(`
  *[
    _type == "post"
    && defined(slug.current)
    && count(brands[@ in $brands]) > 0
  ] | order(publishedAt desc)[0...$limit]{ ${ARTICLE_CARD} }
`)

// The Categories page (`$id` from categoriesPageDocumentId), built from blocks, and its filter options. Topics and
// regions are the ones with at least one post on this brand, alphabetical; categories are all of them, as links to the
// list come from articles and Related topics. The page resolves URL slugs against these lists, so the list query takes
// ids only.
export const CATEGORIES_PAGE_QUERY = defineQuery(`
  {
    "page": *[_type == "page" && _id == $id && brand == $brand][0]{
      _id,
      title,
      blocks[]{ _key, _type, ${BLOCKS_PROJECTION} }
    },
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
    topBanner{ use, image, link },
    bottomBanner{ use, image, link },
    segment{ id, name },
    scheduledAt,
    status,
    brevoCampaignId,
    sendingStartedAt,
    sendRequestedAt,
    "postIds": posts[]._ref
  }
`)

// What the email and the Brevo campaign need: the publication's Brand settings (with its default banners and the email
// copy; an unset field hides its element) and the issue's posts. Raw ids, so `_id in $postIds` matches published posts only (a draft's id
// carries the `drafts.` prefix), and only posts that are still on the issue's brand. The caller restores the issue's
// order.
export const NEWSLETTER_EMAIL_QUERY = defineQuery(`
  {
    "brand": *[_type == "brand" && _id == $brandId && key.current == $brand][0]{
      title,
      domain,
      logo,
      "senderId": newsletter.sender.id,
      "topBanner": newsletter.topBanner{ image, link },
      "bottomBanner": newsletter.bottomBanner{ image, link },
      "copy": newsletter.copy{ featuredLabel, readFullStory, readMore, advertisementLabel, footerText, unsubscribe }
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
// short extract of it, for events and awards editions too, so they match on their overview and not only the title.
// The standfirst is a post's excerpt, else the record's own standfirst (resources and awards editions). Events and awards editions are pictured by their logo only, never their photographs.
const SEARCH_RECORD_PROJECTION = `
  _id,
  _type,
  title,
  "slug": slug.current,
  brands,
  "excerpt": select(_type == "post" => excerpt, standfirst),
  "author": author->name,
  "category": category->title,
  "bodyText": select(
    _type == "post" => pt::text(content),
    _type in ["resource", "conferenceEvent", "awardsProgramme"] => pt::text(body)
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
    _type == "resource" => downloadThumbnail{ asset, crop, "alt": coalesce(alt, asset->altText) }
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

// An award category page: one category as awarded by one evergreen programme (`$programme` and `$category` are the
// slugs). Shared records carry no brand: the page is served on ClearView only, which the route checks.
// `^.^` inside the editions' winner filter is the category. `editions` holds only the programme's
// editions that have a winner in the category, newest first, each with those winner rows. The copy (description,
// eligibility, recognises, judging) is the category's own and shows on every programme's page for it.
export const AWARD_CATEGORY_QUERY = defineQuery(`
  *[_type == "awardCategory" && slug.current == $category][0]{
    _id,
    title,
    "slug": slug.current,
    categoryGroup,
    description,
    eligibility,
    recognises,
    judging,
    "programme": *[_type == "awardsProgrammeGroup" && slug.current == $programme][0]{ _id, title, "slug": slug.current },
    "editions": *[
      _type == "awardsProgramme"
      && programme->slug.current == $programme
      && ^._id in winners[].category._ref
    ] | order(startDate desc){
      _id,
      title,
      "slug": slug.current,
      startDate,
      "winners": winners[category._ref == ^.^._id]{
        _key,
        categoryGroup,
        people,
        displayName,
        "company": company->{ title, "slug": slug.current, "logo": logo{ ${IMAGE} } }
      }
    }
  }
`)

// The award category page's sidebar: OTHER_AWARDS_FILL (fragments.ts), shared with the Studio panel.
export const OTHER_AWARDS_QUERY = defineQuery(`${OTHER_AWARDS_FILL}`)

// The award category page labels and the editor's sidebar picks (`$id` is AWARD_CATEGORY_PAGE_ID), one cached result
// for every category page. A pick whose edition is unpublished or deleted dereferences to a null edition and is dropped
// by the adapter. The sidebar's status labels are shared with the awards programme page and come from its document
// (`$statusesId` is AWARDS_PROGRAMME_PAGE_ID). The page 404s until both documents are published.
export const AWARD_CATEGORY_PAGE_QUERY = defineQuery(`
  *[_id == $id && _type == "awardCategoryPage"][0]{
    breadcrumbHomeLabel,
    breadcrumbAwardsLabel,
    detailsHeading,
    eligibilityLabel,
    recognisesLabel,
    judgingLabel,
    winnersHeading,
    winnerLabel,
    otherProgrammesHeading[]{ _key, style, children[]{ _key, text } },
    "otherProgrammes": otherProgrammes[]{ _key, title, "edition": edition->{ ${OTHER_AWARDS_EDITION} } },
    "statuses": *[_id == $statusesId && _type == "awardsProgrammePage"][0]{
      launchingSoonLabel,
      submissionsOpenLabel,
      ceremonyDueLabel,
      winnersAnnouncedLabel
    }
  }
`)

// The /events/{slug} record: an awards edition or a conference event, whose slugs are unique across both types.
// `_type` tells the route which page to render, and each type projects its own fields. Shared records carry no
// brand: the page is served on ClearView only, which the route checks.
// Bodies are richText and use the article body projection for image alt text and video file URLs (ARTICLE_BODY).
// `previous`: the programme's latest edition before this one, for the "View previous year" links; null without a
// programme. Winner rows keep the array order, which groups them by category group.
export const AWARDS_PROGRAMME_QUERY = defineQuery(`
  *[_type in ["awardsProgramme", "conferenceEvent"] && slug.current == $slug][0]{
    _type,
    _type == "awardsProgramme" => {
      _id,
      title,
      "slug": slug.current,
      standfirst,
      body[]{ ${ARTICLE_BODY} },
      "logo": logo{ ${IMAGE} },
      "programme": programme->{ _id, "slug": slug.current },
      startDate,
      endDate,
      hideDateTime,
      nominationsOpeningDate,
      nominationsClosingDate,
      country,
      "venue": venue->title,
      registerButtonLink,
      highlightsVideoId,
      "highlightVideoThumbnail": highlightVideoThumbnail{ ${IMAGE} },
      highlightVideoDescription,
      judgesIntro[]{ ${ARTICLE_BODY} },
      judgesPanels[]{
        _key,
        name,
        "people": people[]->{
          _id,
          title,
          jobTitle,
          "company": companies[0]->title,
          "photo": photo{ ${IMAGE} },
          bio[]{ ${ARTICLE_BODY} }
        }
      },
      winners[]{
        _key,
        categoryGroup,
        "category": category->{ title, "slug": slug.current },
        people,
        displayName,
        "company": company->{ title, "logo": logo{ ${IMAGE} } }
      },
      entryCategories,
      "acclaimSlug": acclaim->slug.current,
      "previous": *[
        _type == "awardsProgramme"
        && defined(^.programme._ref)
        && programme._ref == ^.programme._ref
        && startDate < ^.startDate
      ] | order(startDate desc)[0]{ "slug": slug.current }
    },
    _type == "conferenceEvent" => {
      _id,
      title,
      "slug": slug.current,
      eventType,
      body[]{ ${ARTICLE_BODY} },
      "logo": logo{ ${IMAGE} },
      startDate,
      endDate,
      startTime,
      endTime,
      timezoneCode,
      hideDateTime,
      country,
      "venue": venue->{ title, address },
      eventFormat,
      whyAttend{ intro[]{ ${ARTICLE_BODY} }, points },
      speakerTypes[]{
        _key,
        name,
        "people": people[]->{
          _id,
          title,
          jobTitle,
          "company": companies[0]->title,
          "photo": photo{ ${IMAGE} }
        }
      },
      "chairs": chairs[]->{ _id, title, jobTitle, "company": companies[0]->title, "photo": photo{ ${IMAGE} } },
      agenda[]{
        _key,
        title,
        items[]{
          _key,
          time,
          endTime,
          sessionType,
          title,
          text[]{ ${ARTICLE_BODY} },
          speakers[]{ _key, chair, "person": person->{ _id, title, jobTitle, "company": companies[0]->title, "photo": photo{ ${IMAGE} } } }
        }
      },
      agendaText[]{ ${ARTICLE_BODY} },
      sponsorTypes[]{
        _key,
        name,
        "companies": companies[]->{ _id, title, "logo": logo{ ${IMAGE} }, websiteUrl, "about": pt::text(about) }
      },
      "relatedCoverage": relatedCoverage[]->{ _id, title, "slug": slug.current, brands }
    }
  }
`)

// The awards programme page labels, headings and the editor's sidebar picks (`$id` is AWARDS_PROGRAMME_PAGE_ID), one
// cached result for every edition page. Picks as on the award category page (AWARD_CATEGORY_PAGE_QUERY). The page
// 404s until the document is published.
export const AWARDS_PROGRAMME_PAGE_QUERY = defineQuery(`
  *[_id == $id && _type == "awardsProgrammePage"][0]{
    breadcrumbHomeLabel,
    breadcrumbAwardsLabel,
    registerLabel,
    previousYearLabel,
    previousYearWinnersLabel,
    allCategoriesLabel,
    viewBiographyLabel,
    hideBiographyLabel,
    marketingKitText,
    acclaimLinkLabel,
    videoConsentText,
    videoConsentButton,
    navOverviewLabel,
    navJudgesLabel,
    navWinnersLabel,
    navCategoriesLabel,
    navMarketingKitLabel,
    launchingSoonLabel,
    submissionsOpenLabel,
    ceremonyDueLabel,
    winnersAnnouncedLabel,
    overviewHeading[]{ _key, style, children[]{ _key, text } },
    videoHeading[]{ _key, style, children[]{ _key, text } },
    judgesHeading[]{ _key, style, children[]{ _key, text } },
    winnersHeading[]{ _key, style, children[]{ _key, text } },
    categoriesHeading[]{ _key, style, children[]{ _key, text } },
    marketingKitHeading[]{ _key, style, children[]{ _key, text } },
    otherProgrammesHeading[]{ _key, style, children[]{ _key, text } },
    "otherProgrammes": otherProgrammes[]{ _key, title, "edition": edition->{ ${OTHER_AWARDS_EDITION} } }
  }
`)

// The event page labels, headings and the editor's sidebar picks (`$id` is EVENT_PAGE_ID), one cached result for every
// event page. A pick whose event is unpublished or deleted dereferences to a null event and is dropped by the adapter.
// The page 404s until the document is published.
export const EVENT_PAGE_QUERY = defineQuery(`
  *[_id == $id && _type == "eventPage"][0]{
    breadcrumbHomeLabel,
    breadcrumbEventsLabel,
    summitTypeLabel,
    briefingTypeLabel,
    webinarTypeLabel,
    statusLabel,
    upcomingLabel,
    pastLabel,
    eventFormatLabel,
    chairLabel,
    agendaChairLabel,
    venueLabel,
    addressLabel,
    dateLabel,
    timeLabel,
    navOverviewLabel,
    navSpeakersLabel,
    navWhyAttendLabel,
    navAgendaLabel,
    navSponsorsLabel,
    navVenueLabel,
    navRelatedCoverageLabel,
    overviewHeading[]{ _key, style, children[]{ _key, text } },
    speakersHeading[]{ _key, style, children[]{ _key, text } },
    whyAttendHeading[]{ _key, style, children[]{ _key, text } },
    agendaHeading[]{ _key, style, children[]{ _key, text } },
    sponsorsHeading[]{ _key, style, children[]{ _key, text } },
    venueHeading[]{ _key, style, children[]{ _key, text } },
    relatedCoverageHeading[]{ _key, style, children[]{ _key, text } },
    relatedEventsHeading[]{ _key, style, children[]{ _key, text } },
    "relatedEvents": relatedEvents[]{ _key, title, "event": event->{ ${RELATED_EVENT} } }
  }
`)

// The event page's "Related events" fill: RELATED_EVENTS_FILL (fragments.ts), shared with the Studio panel.
export const RELATED_EVENTS_QUERY = defineQuery(`${RELATED_EVENTS_FILL}`)

// The shared listings page (`$id` is SHARED_LISTINGS_PAGE_DOCUMENT_ID, a `page` document on ClearView): its blocks, the
// awards status labels (`$statusesId` is AWARDS_PROGRAMME_PAGE_ID) and the records of the open tab (`$tab`: awards,
// events or research; the other two lists come back empty) for its record listing block. One cached result per tab:
// every filter combination and page is applied by the adapter (src/lib/shared-listings.ts), as the lists are small.
// Statuses are derived there from the dates with `$today` (cachedUkToday), which the blocks' fills use too. Shared
// records carry no brand: the page is served on ClearView only, which the route checks. The page 404s until both
// documents are published.
// `hasWinners` counts winner rows as the edition page shows them: a category and a company that both resolve.
export const SHARED_LISTINGS_PAGE_QUERY = defineQuery(`
  {
    "page": *[_type == "page" && _id == $id && brand == $brand][0]{
      _id,
      title,
      blocks[]{ _key, _type, ${BLOCKS_PROJECTION} }
    },
    "statuses": *[_id == $statusesId && _type == "awardsProgrammePage"][0]{
      launchingSoonLabel,
      submissionsOpenLabel,
      ceremonyDueLabel,
      winnersAnnouncedLabel
    },
    "awards": *[$tab == "awards" && _type == "awardsProgramme" && defined(slug.current)]{
      _id,
      title,
      "slug": slug.current,
      standfirst,
      startDate,
      endDate,
      hideDateTime,
      nominationsOpeningDate,
      nominationsClosingDate,
      country,
      "hasWinners": count(winners[defined(category->title) && defined(company->title)]) > 0
    },
    "events": *[$tab == "events" && _type == "conferenceEvent" && defined(slug.current)]{
      _id,
      title,
      "slug": slug.current,
      startDate,
      endDate,
      hideDateTime,
      country
    },
    "research": *[$tab == "research" && _type == "resource" && category == "research" && defined(slug.current)]{
      _id,
      title,
      "slug": slug.current,
      publishedAt
    }
  }
`)

// A research report at /resource/{slug} and its Executive Summary page (/resource/{slug}/{summary slug}, the report's
// `executiveSummaryPage` document), ClearView only. Everything both pages show: the legacy `body` has no place in the
// design (wb-g-research-report v1.1) and only feeds the metadata description as plain text, as do the rich text
// summary, lead and introduction (pt::text). A field still holding a plain string from before the rich text change
// reads as null. Authors and the partner company dereference in the request's perspective, so a person or company
// unpublished after picking drops out (null) on the live site. The related research picks and fill go through
// relatedResearchItems (src/lib/research-report.ts), shared with the Studio panel.
export const RESEARCH_REPORT_QUERY = defineQuery(`
  *[_type == "resource" && slug.current == $slug][0]{
    _id,
    _type,
    title,
    "slug": slug.current,
    publishedAt,
    edition,
    standfirst,
    summary[]{ ${ARTICLE_BODY} },
    "summaryText": pt::text(summary),
    "bodyText": pt::text(body),
    "featuredImage": featuredImage{ ${IMAGE} },
    "downloadThumbnail": downloadThumbnail{ ${IMAGE} },
    downloadUrl,
    "downloadFileUrl": downloadFile.asset->url,
    keyFindings[]{ _key, value, text, note },
    methodologyIntro[]{ ${ARTICLE_BODY} },
    methodology[]{ _key, label, value },
    charts[]{ _key, title, note, gauges[]{ _key, label, value, percent, current } },
    insights,
    "authors": authors[]->{ _id, title },
    researchPartner{
      description,
      "company": company->{ _id, title, "logo": logo{ ${IMAGE} }, websiteUrl }
    },
    "executiveSummaryPage": executiveSummaryPage->{
      _id,
      _type,
      "slug": slug.current,
      lead[]{ ${ARTICLE_BODY} },
      "leadText": pt::text(lead),
      intro[]{ ${ARTICLE_BODY} },
      "introText": pt::text(intro),
      sections[]{ _key, heading, body[]{ ${ARTICLE_BODY} } }
    },
    "relatedResearch": relatedResearch[]->{ ${RELATED_RESEARCH} },
    "relatedResearchFill": ${RELATED_RESEARCH_FILL}
  }
`)

// The research report pages' labels and headings (`$id` is RESEARCH_REPORT_PAGE_ID), one cached result for every
// report. The pages 404 until the document is published.
export const RESEARCH_REPORT_PAGE_QUERY = defineQuery(`
  *[_id == $id && _type == "researchReportPage"][0]{
    breadcrumbHomeLabel,
    breadcrumbResearchLabel,
    typeLabel,
    downloadLabel,
    readFullSummaryLabel,
    companyProfileLabel,
    navExecutiveSummaryLabel,
    navKeyFindingsLabel,
    navMethodologyLabel,
    navInsightsLabel,
    navResearchPartnerLabel,
    navRelatedResearchLabel,
    summaryBreadcrumbLabel,
    summaryTitle,
    summaryReportLabel,
    summaryEditionLabel,
    summaryDateLabel,
    summaryPartnerLabel,
    backToReportLabel,
    executiveSummaryHeading[]{ _key, style, children[]{ _key, text } },
    keyFindingsHeading[]{ _key, style, children[]{ _key, text } },
    methodologyHeading[]{ _key, style, children[]{ _key, text } },
    insightsHeading[]{ _key, style, children[]{ _key, text } },
    selectedInsightsHeading[]{ _key, style, children[]{ _key, text } },
    researchPartnerHeading[]{ _key, style, children[]{ _key, text } },
    relatedResearchHeading[]{ _key, style, children[]{ _key, text } },
    keyTakeawaysHeading[]{ _key, style, children[]{ _key, text } },
    mostReadHeading[]{ _key, style, children[]{ _key, text } }
  }
`)
