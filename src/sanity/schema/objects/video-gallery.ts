import { PlayIcon } from '@sanity/icons/Play'
import { defineArrayMember, defineField, defineType } from 'sanity'

import { altField } from '../fields'

/**
 * A shared thumbnail plus a list of Vimeo clips.
 *
 * Two source groups have this exact shape: `cyph_winners_videos` (5 events,
 * clip per winner, optionally tagged with the categories won) and
 * `cyph_sponsors_videos` (16 events, clip per sponsor). The sponsor variant's
 * third field, `cyph_sponsor_video_details`, is empty on all 255 records and is
 * not carried over.
 */
export const videoGallery = defineType({
  name: 'videoGallery',
  title: 'Video gallery',
  type: 'object',
  icon: PlayIcon,
  fields: [
    defineField({
      name: 'thumbnail',
      title: 'Thumbnail image',
      type: 'image',
      options: { hotspot: true },
      fields: [altField],
    }),
    defineField({
      name: 'videos',
      title: 'Videos',
      type: 'array',
      of: [
        defineArrayMember({
          name: 'video',
          title: 'Video',
          type: 'object',
          fieldsets: [{ name: 'clip', title: 'Clip', options: { columns: 2 } }],
          fields: [
            defineField({
              name: 'vimeoId',
              title: 'Vimeo ID',
              type: 'string',
              fieldset: 'clip',
              description: 'Digits only, not the URL.',
              validation: (Rule) =>
                Rule.required().regex(/^\d+$/, { name: 'Vimeo ID', invert: false }),
            }),
            defineField({
              name: 'name',
              title: 'Winner or sponsor',
              type: 'string',
              fieldset: 'clip',
              validation: (Rule) => Rule.required(),
            }),
            defineField({
              name: 'categoryGroups',
              title: 'Winning categories',
              type: 'array',
              description: 'Winners galleries only.',
              of: [
                defineArrayMember({
                  name: 'winningCategories',
                  title: 'Category group',
                  type: 'object',
                  fields: [
                    defineField({
                      name: 'group',
                      title: 'Category group',
                      type: 'string',
                    }),
                    defineField({
                      name: 'categories',
                      title: 'Categories',
                      type: 'text',
                      rows: 2,
                    }),
                  ],
                  preview: {
                    select: { title: 'group', subtitle: 'categories' },
                  },
                }),
              ],
            }),
          ],
          preview: {
            select: { name: 'name', vimeoId: 'vimeoId' },
            prepare({ name, vimeoId }) {
              return { title: name || 'Untitled video', subtitle: vimeoId }
            },
          },
        }),
      ],
      validation: (Rule) => Rule.min(1),
    }),
  ],
  preview: {
    select: { videos: 'videos', media: 'thumbnail' },
    prepare({ videos, media }) {
      const count = (videos as unknown[] | undefined)?.length ?? 0

      return {
        title: 'Video gallery',
        subtitle: `${count} ${count === 1 ? 'video' : 'videos'}`,
        media,
      }
    },
  },
})
