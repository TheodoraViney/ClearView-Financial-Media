import { defineArrayMember, defineField } from 'sanity'

import { adSlot } from './ad-slot'
import { cta } from './cta'
import { publications } from './publications'
import { splitLayout } from './split-layout'
import { topStories } from './top-stories'

export const blockTypes = [cta, adSlot, splitLayout, topStories, publications]

export const blocksField = defineField({
  name: 'blocks',
  title: 'Blocks',
  type: 'array',
  of: blockTypes.map((blockType) => defineArrayMember({ type: blockType.name })),
})
