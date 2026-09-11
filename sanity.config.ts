import { visionTool } from '@sanity/vision'
import { defineConfig, type Template } from 'sanity'
import { structureTool } from 'sanity/structure'

import { apiVersion, dataset, projectId } from './src/sanity/env'
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
  plugins: [structureTool({ structure }), ...presentationTools, visionTool({ defaultApiVersion: apiVersion })],
})
