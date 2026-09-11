import { defineCliConfig } from 'sanity/cli'

export default defineCliConfig({
  api: {
    projectId: 'hcxqlh4h',
    dataset: process.env.NEXT_PUBLIC_SANITY_DATASET ?? 'production',
  },
  typegen: {
    path: './src/**/*.{ts,tsx,js,jsx}',
    schema: './schema.json',
    generates: './src/sanity/types.ts',
  },
})
