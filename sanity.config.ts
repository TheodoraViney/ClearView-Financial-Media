import { defineConfig, type DocumentActionComponent, type InitialValueResolverContext, type Template } from 'sanity'
import { media } from 'sanity-plugin-media'
import { structureTool } from 'sanity/structure'

import { BRANDS, brandDocumentId, isEditorialBrandKey } from './src/brands'
import { isLockedStatus } from './src/lib/newsletter-status'
import { newsletterIssueActions } from './src/sanity/actions/newsletter'
import { apiVersion, dataset, projectId } from './src/sanity/env'
import { fetchArticlesPerIssue, fetchLatestPostIds, postReferences } from './src/sanity/newsletter-articles'
import { presentationTools } from './src/sanity/presentation'
import { schemaTypes } from './src/sanity/schema'
import { structure } from './src/sanity/structure'

const pageByBrandTemplate: Template = {
  id: 'page-by-brand',
  title: 'Page',
  schemaType: 'page',
  parameters: [{ name: 'brand', type: 'string' }],
  value: ({ brand }: { brand: string }) => ({ brand }),
}

/**
 * A post starts on the brand whose folder it is created in, with the image credit set to that brand's name: the
 * title from its Brand settings, else the code constant. A failed lookup falls back to the constant.
 */
const postByBrandTemplate: Template = {
  id: 'post-by-brand',
  title: 'Post',
  schemaType: 'post',
  parameters: [{ name: 'brand', type: 'string' }],
  value: async (params: { brand?: string } | undefined, context: InitialValueResolverContext) => {
    const brand = params?.brand

    // Posts belong to the editorial brands only; ClearView carries no articles.
    if (!brand || !isEditorialBrandKey(brand)) {
      return {}
    }

    let credit = BRANDS[brand].title

    try {
      const title = await context
        .getClient({ apiVersion })
        .fetch<string | null>('*[_id == $id][0].title', { id: brandDocumentId(brand) })

      credit = title?.trim() || credit
    } catch {
      // Keep the code constant.
    }

    return { brands: [brand], image: { _type: 'image', credit } }
  },
}

/**
 * A new issue starts with the brand's latest published articles (Brand settings → Newsletter → Articles per
 * issue). A failed lookup still creates the issue, just with no posts.
 */
const newsletterIssueByBrandTemplate: Template = {
  id: 'newsletter-issue-by-brand',
  title: 'Newsletter issue',
  schemaType: 'newsletterIssue',
  parameters: [{ name: 'brand', type: 'string' }],
  value: async (params: { brand?: string } | undefined, context: InitialValueResolverContext) => {
    const brand = params?.brand

    if (!brand || !isEditorialBrandKey(brand)) {
      return { brand }
    }

    try {
      const client = context.getClient({ apiVersion })
      const count = await fetchArticlesPerIssue(client, brand)
      const ids = await fetchLatestPostIds(client, { brand, count })

      return { brand, posts: postReferences(ids) }
    } catch {
      return { brand }
    }
  },
}

/**
 * Document types that exist only as fixed-id singletons opened from the
 * structure (see `src/sanity/structure.ts`). No template, so they never appear
 * in "Create new document", and no duplicate or delete action.
 */
const SINGLETON_TYPES = new Set([
  'clearviewHeader',
  'publicationHeader',
  'clearviewFooter',
  'publicationFooter',
  'mostRead',
  'articlePage',
])

const SINGLETON_REMOVED_ACTIONS = new Set(['duplicate', 'delete'])

/**
 * Newsletter issue actions removed outright.
 *
 * - `duplicate` would copy brevoCampaignId and status, so actions on the copy
 *   would act on the original's campaign.
 * - `restore` (History) could bring back an old status or campaign id that no
 *   longer matches Brevo.
 */
const NEWSLETTER_ISSUE_REMOVED_ACTIONS = new Set(['duplicate', 'restore'])

/**
 * Delete, disabled while the issue is scheduled or sent. Deleting a scheduled
 * issue leaves its campaign scheduled in Brevo, and a sent one is the record
 * of what went out. The actions resolver never sees the document, so the
 * built-in action is wrapped and reads the status from its props. Either
 * version being locked is enough, so a stale draft cannot unlock it.
 */
const lockableDelete = (original: DocumentActionComponent): DocumentActionComponent => {
  const LockableDelete: DocumentActionComponent = (props) => {
    const description = original(props)
    const locked = isLockedStatus(props.draft?.status) || isLockedStatus(props.published?.status)

    if (!description || !locked) {
      return description
    }

    return {
      ...description,
      disabled: true,
      title: 'Cancel the scheduled issue before deleting it. A sent issue cannot be deleted.',
    }
  }

  LockableDelete.action = original.action
  return LockableDelete
}

export default defineConfig({
  name: 'default',
  title: 'WealthBriefing Group',
  basePath: '/studio',
  projectId,
  dataset,
  // Token login: Studio keeps the user's token in localStorage instead of a cookie session. The newsletter actions
  // send that token to /api/newsletter/*, which checks the user and their role with it (users/me). A cookie session
  // is invisible to our own code, so with it the actions would have nothing to send.
  auth: { loginMethod: 'token' },
  schema: {
    types: schemaTypes,
    templates: (prev) => [
      // An issue gets its brand from the publication folder it is created in, so it has no global template.
      ...prev.filter(
        (template) =>
          template.id !== 'brand' && template.id !== 'newsletterIssue' && !SINGLETON_TYPES.has(template.schemaType),
      ),
      pageByBrandTemplate,
      postByBrandTemplate,
      newsletterIssueByBrandTemplate,
    ],
  },
  document: {
    actions: (prev, { schemaType }) => {
      if (SINGLETON_TYPES.has(schemaType)) {
        return prev.filter((action) => !action.action || !SINGLETON_REMOVED_ACTIONS.has(action.action))
      }

      if (schemaType === 'newsletterIssue') {
        return prev
          .filter((action) => !action.action || !NEWSLETTER_ISSUE_REMOVED_ACTIONS.has(action.action))
          .map((action) => (action.action === 'delete' ? lockableDelete(action) : action))
          .concat(newsletterIssueActions)
      }

      return prev
    },
  },
  // `media` adds the asset browser Studio has no built-in equivalent for: without
  // it, the 6,605 migrated files are reachable only by opening a document that
  // happens to reference one.
  plugins: [structureTool({ structure }), media(), ...presentationTools],
  releases: { enabled: false },
})
