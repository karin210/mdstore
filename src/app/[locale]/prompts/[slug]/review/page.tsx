import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Suspense, type ReactElement } from "react";
import { ReviewBody } from "@/components/review/ReviewBody/ReviewBody";
import { ReviewSkeleton } from "@/components/review/ReviewSkeleton/ReviewSkeleton";
import styles from "./page.module.css";

/**
 * Reviews exist only for posted prompts, whose slugs aren't known at build time, and the shared
 * header reads the URL (the language switcher). The page renders per request, for its authors and
 * the admins only; this opts it out of the static-shell check.
 */
export const instant = false;

/** Reviews are private to a post's authors and the admins: never indexed. */
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("review.meta");
  return { title: t("title"), robots: { index: false, follow: false } };
}

/**
 * A post's review, like a pull request: the conversation, the file of each revision with line
 * comments, the changes between revisions, and (for authors) a form to push a new version.
 * Everything URL- and session-specific is read inside <Suspense>, so the shell renders at once.
 * src/proxy.ts answers 404 before rendering for visitors who can't see the review.
 */
export default function ReviewPage({
  params,
  searchParams,
}: PageProps<"/[locale]/prompts/[slug]/review">): ReactElement {
  return (
    <main className={styles.main}>
      <Suspense fallback={<ReviewSkeleton />}>
        <ReviewBody params={params} searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
