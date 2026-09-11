import { CalendarIcon } from '@sanity/icons/Calendar'
import { CogIcon } from '@sanity/icons/Cog'
import { DocumentIcon } from '@sanity/icons/Document'
import { DocumentTextIcon } from '@sanity/icons/DocumentText'
import { EarthGlobeIcon } from '@sanity/icons/EarthGlobe'
import { StarIcon } from '@sanity/icons/Star'
import type { StructureResolver } from 'sanity/structure'

import { BRAND_KEYS, BRANDS, brandDocumentId } from '@/brands'

export const structure: StructureResolver = (S) =>
  S.list()
    .title('Publishing')
    .items([
      ...BRAND_KEYS.map((key) =>
        S.listItem()
          .title(BRANDS[key].title)
          .icon(EarthGlobeIcon)
          .child(
            S.list()
              .title(BRANDS[key].title)
              .items([
                S.listItem()
                  .title('Pages')
                  .icon(DocumentIcon)
                  .child(
                    S.documentTypeList('page')
                      .title('Pages')
                      .filter('_type == "page" && brand == $brand')
                      .params({ brand: key })
                      .initialValueTemplates([S.initialValueTemplateItem('page-by-brand', { brand: key })]),
                  ),
                S.listItem()
                  .title('Posts')
                  .icon(DocumentTextIcon)
                  .child(
                    S.documentTypeList('post')
                      .title('Posts')
                      .filter('_type == "post" && $brand in brands')
                      .params({ brand: key })
                      .initialValueTemplates([S.initialValueTemplateItem('post-by-brand', { brand: key })]),
                  ),
                S.listItem()
                  .title('Brand settings')
                  .icon(CogIcon)
                  .child(S.document().schemaType('brand').documentId(brandDocumentId(key))),
              ]),
          ),
      ),
      S.divider(),
      S.documentTypeListItem('post').title('All Posts').icon(DocumentTextIcon),
      S.documentTypeListItem('award').title('Awards').icon(StarIcon),
      S.documentTypeListItem('event').title('Events').icon(CalendarIcon),
    ])
