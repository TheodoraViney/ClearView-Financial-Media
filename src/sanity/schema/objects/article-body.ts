import { defineArrayMember, defineType } from 'sanity'

import { richTextBlock, richTextEmbed, richTextImage, richTextVideoFile } from './rich-text'

/**
 * The body of a post: everything `richText` offers, plus the blocks an
 * article places between paragraphs. Only `post` uses it, so the migrated
 * event prose never offers article blocks.
 */
export const articleBody = defineType({
  name: 'articleBody',
  title: 'Article body',
  type: 'array',
  of: [
    richTextBlock,
    richTextImage,
    richTextVideoFile,
    richTextEmbed,
    defineArrayMember({ type: 'pullQuote' }),
    defineArrayMember({ type: 'factBox' }),
    defineArrayMember({ type: 'infographic' }),
    defineArrayMember({ type: 'adBreak' }),
  ],
})
