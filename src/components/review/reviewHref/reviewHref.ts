/** The review page's tabs, as the `tab` search param spells them. */
export const REVIEW_TABS = ["conversation", "file", "changes", "revise"] as const;
export type ReviewTab = (typeof REVIEW_TABS)[number];

/**
 * A link to the review page in the shape next-intl's <Link> takes (it adds the locale prefix).
 * Each view is a URL, so it can be shared and survives a reload.
 */
export function review_href(
  slug: string,
  query: { review?: number; tab?: ReviewTab; revision?: number } = {},
): { pathname: string; query: Record<string, string> } {
  const search: Record<string, string> = {};
  if (query.review !== undefined) search.review = String(query.review);
  if (query.tab && query.tab !== "conversation") search.tab = query.tab;
  if (query.revision !== undefined) search.revision = String(query.revision);
  return { pathname: `/prompts/${slug}/review`, query: search };
}
