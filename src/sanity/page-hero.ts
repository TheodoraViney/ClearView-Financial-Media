import { stegaClean, type PortableTextProps } from 'next-sanity'

import { portableTextToPlain, type PlainBlock } from '@/lib/portable-text-plain'

/** The Page heading block's intro as the components render it: paragraphs with bold, italic and links. */
export type HeroIntro = PortableTextProps['value']

/**
 * The Page heading block's intro, or null without text. Intros stored before the field became rich text are strings;
 * until they are moved, a string becomes one paragraph.
 */
export function toHeroIntro(value: unknown): HeroIntro | null {
  if (typeof value === 'string') {
    return stegaClean(value).trim()
      ? [
          {
            _type: 'block',
            _key: 'intro',
            style: 'normal',
            markDefs: [],
            children: [{ _type: 'span', _key: 'intro-text', text: value, marks: [] }],
          },
        ]
      : null
  }

  return Array.isArray(value) && heroIntroText(value) ? (value as HeroIntro) : null
}

/** An intro as plain text without stega, for a meta description. */
export const heroIntroText = (value: HeroIntro | null): string =>
  stegaClean(portableTextToPlain(Array.isArray(value) ? (value as PlainBlock[]) : null)).trim()
