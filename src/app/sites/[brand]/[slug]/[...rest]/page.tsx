import { notFound } from 'next/navigation'

/**
 * Any address of two or more segments that no other route matches lands here and shows the brand's not-found page,
 * with its header and footer. Without it Next serves its bare default 404 outside the brand layout.
 */
export default function UnmatchedPage() {
  notFound()
}
