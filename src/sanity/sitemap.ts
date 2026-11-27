import { stegaClean } from 'next-sanity'

import {
  AWARD_CATEGORY_PAGE_ID,
  AWARDS_PROGRAMME_PAGE_ID,
  brandOrigin,
  categoriesPageDocumentId,
  EVENT_PAGE_ID,
  isEditorialBrandKey,
  PARTNER_PROFILE_PAGE_ID,
  RESEARCH_REPORT_PAGE_ID,
  type BrandKey,
} from '@/brands'
import { CATEGORIES_PATH } from '@/lib/categories'
import { COMPANY_ENGAGEMENT_PAGE_DOCUMENT_ID } from '@/lib/company-engagement'
import { awardCategoryHref, COMPANY_ENGAGEMENT_PATH, sharedRecordHref } from '@/lib/links'
import { executiveSummaryPath, hasExecutiveSummary } from '@/lib/research-report'
import { SHARED_LISTINGS_PAGE_DOCUMENT_ID, SHARED_LISTINGS_TAB_PATHS } from '@/lib/shared-listings'
import { isSelfCanonical, newest, type SitemapUrl } from '@/lib/sitemap'

import { cachedSanity } from './live'
import { SITEMAP_QUERY } from './queries'

type Seo = { canonical?: string | null; noIndex?: boolean | null } | null

/**
 * Every public URL of a brand that search engines should index, as the brand's routes serve them
 * (src/app/sites/[brand]/): the home page, pages, the Categories page and posts on the editorial brands; on ClearView
 * also the shared listings at their canonical paths, the Company Engagement page, awards editions and conference
 * events, award category pages, research reports and their Executive Summary pages, and company profiles.
 *
 * Left out: noindex documents, documents whose canonical override names another URL, a post on any brand but its
 * first (its canonical home), filtered and paged listing views, search and the legacy-path aliases whose canonical is
 * another listing (/events-category/briefings, /events-category/webinar, /resource). lastmod is the document's
 * `_updatedAt`; a listing takes the newest of its page and its records.
 *
 * Published content only, through cachedSanity, so the result is cached per brand and expires with Sanity Live.
 */
export async function cmsSitemapUrls(brand: BrandKey): Promise<SitemapUrl[]> {
  const { data } = await cachedSanity({
    query: SITEMAP_QUERY,
    params: {
      brand,
      categoriesId: isEditorialBrandKey(brand) ? categoriesPageDocumentId(brand) : '',
      awardCategoryPageId: AWARD_CATEGORY_PAGE_ID,
      awardsProgrammePageId: AWARDS_PROGRAMME_PAGE_ID,
      eventPageId: EVENT_PAGE_ID,
      researchReportPageId: RESEARCH_REPORT_PAGE_ID,
      partnerProfilePageId: PARTNER_PROFILE_PAGE_ID,
      sharedListingsId: SHARED_LISTINGS_PAGE_DOCUMENT_ID,
      companyEngagementId: COMPANY_ENGAGEMENT_PAGE_DOCUMENT_ID,
    },
    perspective: 'published',
    stega: false,
  })

  const origin = brandOrigin(brand)
  const urls = new Map<string, SitemapUrl>()

  /** Adds a path unless the document is noindex or (when its canonical override counts) canonical to another URL. */
  const add = (path: string | null, lastmod: string | null, seo: Seo, { ownCanonical = true } = {}) => {
    if (!path || seo?.noIndex || (ownCanonical && !isSelfCanonical(stegaClean(seo?.canonical), brand, path))) {
      return
    }

    const loc = `${origin}${path === '/' ? '' : path}`
    const known = urls.get(loc)

    urls.set(loc, { loc, lastmod: newest(known?.lastmod, lastmod) })
  }

  const posts = (data.posts ?? []).filter((post) => {
    const first = stegaClean(post.firstBrand)

    // The page's canonical is the first brand's URL; a first brand that is not editorial leaves every host its own.
    return !first || first === brand || !isEditorialBrandKey(first)
  })
  const latestPost = newest(...posts.map((post) => post._updatedAt))
  const cv = data.cv

  if (data.home) {
    const latestRecord = newest(...(cv.records ?? []).map((record) => record._updatedAt))

    add('/', newest(data.home._updatedAt, isEditorialBrandKey(brand) ? latestPost : latestRecord), data.home.seo)
  }

  for (const page of data.pages ?? []) {
    add(`/${encodeURIComponent(page.slug ?? '')}`, page._updatedAt, page.seo)
  }

  if (isEditorialBrandKey(brand)) {
    // The page document serves every filtered view, so its canonical override is not used (as in its metadata).
    if (data.categoriesPage) {
      add(CATEGORIES_PATH, newest(data.categoriesPage._updatedAt, latestPost), data.categoriesPage.seo, {
        ownCanonical: false,
      })
    }

    for (const post of posts) {
      add(`/posts/${encodeURIComponent(post.slug ?? '')}`, post._updatedAt, post.seo)
    }
  }

  if (brand !== 'clearview') {
    return [...urls.values()]
  }

  const records = cv.records ?? []
  const editions = records.filter((record) => record._type === 'awardsProgramme')
  const events = records.filter((record) => record._type === 'conferenceEvent')
  const resources = cv.resources ?? []

  // The shared listings need the awards labels document for their status labels, as the route does.
  if (cv.sharedListings && cv.awardsLabels) {
    const page = cv.sharedListings
    const latest = {
      awards: newest(...editions.map((record) => record._updatedAt)),
      events: newest(...events.map((record) => record._updatedAt)),
      research: newest(...resources.map((record) => record._updatedAt)),
    }

    for (const tab of ['awards', 'events', 'research'] as const) {
      add(SHARED_LISTINGS_TAB_PATHS[tab], newest(page._updatedAt, latest[tab]), page.seo, { ownCanonical: false })
    }
  }

  if (cv.companyEngagement) {
    add(COMPANY_ENGAGEMENT_PATH, cv.companyEngagement._updatedAt, cv.companyEngagement.seo)
  }

  for (const record of records) {
    if (record._type === 'awardsProgramme' ? cv.awardsLabels : cv.eventLabels) {
      add(sharedRecordHref(record._type, record.slug, 'clearview'), record._updatedAt, record.seo)
    }
  }

  // One page per category and programme that awarded it. The page ignores the category's canonical override.
  if (cv.awardCategoryLabels && cv.awardsLabels) {
    for (const edition of cv.editions ?? []) {
      for (const category of edition.categories ?? []) {
        add(
          awardCategoryHref(edition.programme, category?.slug, 'clearview'),
          newest(category?._updatedAt, edition._updatedAt),
          category?.seo ?? null,
          { ownCanonical: false },
        )
      }
    }
  }

  if (cv.researchLabels) {
    for (const report of resources) {
      const path = sharedRecordHref('resource', report.slug, 'clearview')
      const summarySlug = stegaClean(report.summary.slug)?.trim()

      add(path, report._updatedAt, report.seo)

      // A noindex report hides its executive summary too.
      if (path && summarySlug && !report.seo?.noIndex && hasExecutiveSummary(report.summary, stegaClean)) {
        add(executiveSummaryPath(path, summarySlug), report._updatedAt, report.summarySeo)
      }
    }
  }

  if (cv.companyLabels) {
    for (const company of cv.companies ?? []) {
      add(sharedRecordHref('company', company.slug, 'clearview'), company._updatedAt, company.seo)
    }
  }

  return [...urls.values()]
}
