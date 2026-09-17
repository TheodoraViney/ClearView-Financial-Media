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

export default defineConfig({
  name: 'default',
  title: 'WealthBriefing Group',
  basePath: '/studio',
  projectId,
  dataset,
  schema: {
    types: schemaTypes,
    templates: (prev) => [
      ...prev.filter((template) => template.id !== 'brand'),
      pageByBrandTemplate,
      postByBrandTemplate,
    ],
  },
  // `media` adds the asset browser Studio has no built-in equivalent for: without
  // it, the 6,605 migrated files are reachable only by opening a document that
  // happens to reference one.
  plugins: [structureTool({ structure }), media(), ...presentationTools],
  releases: { enabled: false },
})
