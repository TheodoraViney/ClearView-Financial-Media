import { defineQuery } from 'next-sanity'

import { BLOCKS_PROJECTION, LINK, LINK_TARGET } from './fragments'

// The site shell: the brand's header and footer documents and its Brand settings, in one round trip.
// All three ids derive from $brand (headerDocumentId / footerDocumentId / brandDocumentId), and the
// Brand settings match is also checked against $brand.
// navLink stores its visible text in `label`, so its link has no label of its own (LINK_TARGET).
// brandColor feeds the layout's --brand-color until brand colours move to tokens.
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

// A publication's Brevo settings, read server-side by subscribeToPublication. Same double match as the shell:
// the fixed id from brandDocumentId($brand) and key.current == $brand. Null fields mean not configured yet.
export const NEWSLETTER_SETTINGS_QUERY = defineQuery(`
  *[_type == "brand" && _id == $brandId && key.current == $brand][0].newsletter{
    brevoListId,
    confirmationTemplateId
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
    scheduledAt,
    status,
    brevoCampaignId,
    sendingStartedAt,
    sendRequestedAt,
    "postIds": posts[]._ref
  }
`)

// What the email and the Brevo campaign need: the publication's Brand settings and the issue's posts. Raw ids, so
// `_id in $postIds` matches published posts only (a draft's id carries the `drafts.` prefix), and only posts that
// are still on the issue's brand. The caller restores the issue's order.
export const NEWSLETTER_EMAIL_QUERY = defineQuery(`
  {
    "brand": *[_type == "brand" && _id == $brandId && key.current == $brand][0]{
      title,
      logo,
      newsletter{ brevoListId, senderEmail, senderName }
    },
    "posts": *[_type == "post" && _id in $postIds && $brand in brands]{
      _id,
      title,
      excerpt,
      "slug": slug.current,
      publishedAt
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

// Header search suggestions, read by searchSite in src/lib/search.ts. Titles only (posts: title and excerpt, the title
// weighted 3x), never body text. $q is the user's term as a GROQ param, never interpolated, with a trailing `*` so the last
// word matches as a prefix. $brands is the editorial keys on ClearView and the current brand elsewhere; the shared group
// records have no brand field and show on every host. Undated records sort after dated ones (GROQ puts null first in
// desc).
export const SITE_SEARCH_QUERY = defineQuery(`
  {
    "posts": *[
      _type == "post"
      && defined(slug.current)
      && count(brands[@ in $brands]) > 0
      && (title match $q || excerpt match $q)
    ] | score(boost(title match $q, 3), excerpt match $q)
      | order(_score desc, defined(publishedAt) desc, publishedAt desc)[0...5]{
        title,
        "slug": slug.current,
        brands,
        publishedAt
      },
    "events": *[_type == "conferenceEvent" && defined(slug.current) && title match $q]
      | score(title match $q)
      | order(_score desc, defined(startDate) desc, startDate desc)[0...3]{
        title,
        "slug": slug.current,
        startDate,
        endDate,
        hideDateTime
      },
    "awards": *[_type == "awardsProgramme" && defined(slug.current) && title match $q]
      | score(title match $q)
      | order(_score desc, defined(startDate) desc, startDate desc)[0...3]{
        title,
        "slug": slug.current,
        startDate,
        endDate,
        hideDateTime
      },
    "resources": *[_type == "resource" && defined(slug.current) && title match $q]
      | score(title match $q)
      | order(_score desc, defined(publishedAt) desc, publishedAt desc)[0...3]{
        title,
        "slug": slug.current,
        publishedAt
      }
  }
`)
