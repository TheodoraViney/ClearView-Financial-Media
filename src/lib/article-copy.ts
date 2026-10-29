/*
 * Visible labels of the article page, edited per brand in the "Article page" document. These design texts are the
 * fields' initial values in the Studio and the seed. The page falls back to them while a brand's document is
 * missing or a field is empty, so a fresh dataset never renders blank buttons.
 */
export const ARTICLE_PAGE_COPY_DEFAULTS = {
  recommendedHeading: 'Recommended articles',
  breadcrumbHomeLabel: 'Home',
  shareLabel: 'Share',
  copyLinkLabel: 'Copy link',
  linkCopiedLabel: 'Link copied',
  readTimeSuffix: 'min read',
  imageCreditPrefix: 'Image:',
  shareRailLabel: 'Share',
} as const

export type ArticlePageCopy = { [K in keyof typeof ARTICLE_PAGE_COPY_DEFAULTS]: string }
