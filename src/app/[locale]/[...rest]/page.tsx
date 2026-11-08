import { notFound } from "next/navigation";

/**
 * Catch-all for every URL under a locale that no other route matches. The branded 404 lives in
 * ../not-found.tsx; without this route Next.js would show its default 404 for unmatched URLs,
 * because the root layout sits inside the [locale] segment.
 */
export default function UnmatchedPage(): never {
  notFound();
}
