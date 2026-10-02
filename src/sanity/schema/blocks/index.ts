import { defineArrayMember, defineField } from 'sanity'

import { adSlot } from './ad-slot'
import { cta } from './cta'
import { splitLayout } from './split-layout'

export const blockTypes = [cta, adSlot, splitLayout]

export const blocksField = defineField({
  name: 'blocks',
  title: 'Blocks',
  type: 'array',
  of: blockTypes.map((blockType) => defineArrayMember({ type: blockType.name })),
})
