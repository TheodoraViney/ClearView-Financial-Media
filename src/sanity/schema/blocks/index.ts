import { defineArrayMember, defineField } from 'sanity'

import { cta } from './cta'

export const blockTypes = [cta]

export const blocksField = defineField({
  name: 'blocks',
  title: 'Blocks',
  type: 'array',
  of: blockTypes.map((blockType) => defineArrayMember({ type: blockType.name })),
})
