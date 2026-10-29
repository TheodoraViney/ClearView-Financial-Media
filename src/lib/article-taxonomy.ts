/*
 * Fixed document ids of the article taxonomy that the schema relies on, kept
 * outside the schema so other code can import them without loading Sanity.
 * No dots: the site reads anonymously and sees root-path ids only.
 */

/** Seeded categories have the fixed id `category-{slug}`. Editor-made ones get generated ids. */
export const categoryDocumentId = (slug: string): string => `category-${slug}`

/** The post's region field applies only to this category. */
export const PEOPLE_MOVES_CATEGORY_ID = categoryDocumentId('people-moves')
