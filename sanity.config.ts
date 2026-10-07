import { defineConfig, type Template } from 'sanity'
import { media } from 'sanity-plugin-media'
import { structureTool } from 'sanity/structure'

import { dataset, projectId } from './src/sanity/env'
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

const postByBrandTemplate: Template = {
  id: 'post-by-brand',
  title: 'Post',
  schemaType: 'post',
  parameters: [{ name: 'brand', type: 'string' }],
  value: ({ brand }: { brand: string }) => ({ brands: [brand] }),
}

/**
 * Document types that exist only as fixed-id singletons opened from the
 * structure (see `src/sanity/structure.ts`). No template, so they never appear
 * in "Create new document", and no duplicate or delete action.
 */
const SINGLETON_TYPES = new Set(['clearviewHeader', 'publicationHeader'])

const SINGLETON_REMOVED_ACTIONS = new Set(['duplicate', 'delete'])

export default defineConfig({
  name: 'default',
  title: 'WealthBriefing Group',
  basePath: '/studio',
  projectId,
  dataset,
  schema: {
    types: schemaTypes,
    templates: (prev) => [
      ...prev.filter((template) => template.id !== 'brand' && !SINGLETON_TYPES.has(template.schemaType)),
      pageByBrandTemplate,
      postByBrandTemplate,
    ],
  },
  document: {
    actions: (prev, { schemaType }) =>
      SINGLETON_TYPES.has(schemaType)
        ? prev.filter((action) => !action.action || !SINGLETON_REMOVED_ACTIONS.has(action.action))
        : prev,
  },
  // `media` adds the asset browser Studio has no built-in equivalent for: without
  // it, the 6,605 migrated files are reachable only by opening a document that
  // happens to reference one.
  plugins: [structureTool({ structure }), media(), ...presentationTools],
  releases: { enabled: false },
})
