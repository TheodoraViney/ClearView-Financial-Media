import { BookIcon } from '@sanity/icons/Book'
import { BookmarkIcon } from '@sanity/icons/Bookmark'
import { CalendarIcon } from '@sanity/icons/Calendar'
import { CaseIcon } from '@sanity/icons/Case'
import { CogIcon } from '@sanity/icons/Cog'
import { DocumentIcon } from '@sanity/icons/Document'
import { DocumentPdfIcon } from '@sanity/icons/DocumentPdf'
import { DocumentTextIcon } from '@sanity/icons/DocumentText'
import { EarthGlobeIcon } from '@sanity/icons/EarthGlobe'
import { EnvelopeIcon } from '@sanity/icons/Envelope'
import { FolderIcon } from '@sanity/icons/Folder'
import { InsertBelowIcon } from '@sanity/icons/InsertBelow'
import { MenuIcon } from '@sanity/icons/Menu'
import { StarIcon } from '@sanity/icons/Star'
import { TagIcon } from '@sanity/icons/Tag'
import { TrendUpwardIcon } from '@sanity/icons/TrendUpward'
import { UserIcon } from '@sanity/icons/User'
import { UsersIcon } from '@sanity/icons/Users'
import type { StructureResolver } from 'sanity/structure'

import {
  BRAND_KEYS,
  BRANDS,
  articlePageDocumentId,
  brandDocumentId,
  footerDocumentId,
  headerDocumentId,
  isEditorialBrandKey,
  mostReadDocumentId,
} from '@/brands'

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
                // ClearView carries no articles and sends no newsletter, so its folder has neither list.
                ...(isEditorialBrandKey(key)
                  ? [
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
                        .title('Newsletter issues')
                        .icon(EnvelopeIcon)
                        .child(
                          S.documentTypeList('newsletterIssue')
                            .title('Newsletter issues')
                            .filter('_type == "newsletterIssue" && brand == $brand')
                            .params({ brand: key })
                            .initialValueTemplates([
                              S.initialValueTemplateItem('newsletter-issue-by-brand', { brand: key }),
                            ]),
                        ),
                    ]
                  : []),
                S.listItem()
                  .title('Header')
                  .icon(MenuIcon)
                  .child(S.document().schemaType(BRANDS[key].headerType).documentId(headerDocumentId(key))),
                S.listItem()
                  .title('Footer')
                  .icon(InsertBelowIcon)
                  .child(S.document().schemaType(BRANDS[key].footerType).documentId(footerDocumentId(key))),
                // ClearView carries no articles, so it has no Most read list and no Article page labels.
                ...(isEditorialBrandKey(key)
                  ? [
                      S.listItem()
                        .title('Most read')
                        .icon(TrendUpwardIcon)
                        .child(S.document().schemaType('mostRead').documentId(mostReadDocumentId(key))),
                      S.listItem()
                        .title('Article page')
                        .icon(DocumentTextIcon)
                        .child(S.document().schemaType('articlePage').documentId(articlePageDocumentId(key))),
                    ]
                  : []),
                S.listItem()
                  .title('Brand settings')
                  .icon(CogIcon)
                  .child(S.document().schemaType('brand').documentId(brandDocumentId(key))),
              ]),
          ),
      ),
      S.divider(),
      S.documentTypeListItem('post').title('All Posts').icon(DocumentTextIcon),
      // How posts are classified and who wrote them, shared by every brand.
      S.listItem()
        .title('Articles')
        .icon(FolderIcon)
        .child(
          S.list()
            .title('Articles')
            .items([
              S.documentTypeListItem('category').title('Categories').icon(FolderIcon),
              S.documentTypeListItem('topic').title('Topics').icon(TagIcon),
              S.documentTypeListItem('region').title('Regions').icon(EarthGlobeIcon),
              S.documentTypeListItem('author').title('Authors').icon(UsersIcon),
            ]),
        ),
      S.divider(),
      // Shared records. They belong to the group, not to one brand: filtering
      // them by the host brand would hide them from clearviewpublishing.com.
      S.listItem()
        .title('Awards')
        .icon(StarIcon)
        .child(
          S.list()
            .title('Awards')
            .items([
              S.documentTypeListItem('awardsProgrammeGroup')
                .title('Programmes')
                .icon(BookmarkIcon),
              S.documentTypeListItem('awardsProgramme')
                .title('Editions')
                .icon(StarIcon),
              S.documentTypeListItem('awardCategory')
                .title('Categories')
                .icon(TagIcon),
              S.documentTypeListItem('acclaim').title('Acclaim').icon(BookIcon),
            ]),
        ),
      S.documentTypeListItem('conferenceEvent').title('Events').icon(CalendarIcon),
      S.documentTypeListItem('resource').title('Resources').icon(DocumentPdfIcon),
      S.divider(),
      S.documentTypeListItem('company').title('Companies').icon(CaseIcon),
      S.documentTypeListItem('person').title('People').icon(UserIcon),
    ])
