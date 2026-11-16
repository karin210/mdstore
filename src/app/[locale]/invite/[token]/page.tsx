import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Suspense, type ReactElement } from "react";
import { SkeletonBlock } from "@/components/shared/SkeletonBlock/SkeletonBlock";
import { InviteBody } from "@/components/review/InviteBody/InviteBody";
import styles from "./page.module.css";

/**
 * Every token is new, so there are no params to prerender with, and the shared header reads the URL
 * (the language switcher). The page renders per request; this opts it out of the static-shell check.
 */
export const instant = false;

/** Invite links are private: never indexed. */
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("review.meta");
  return { title: t("inviteTitle"), robots: { index: false, follow: false } };
}

/**
 * Where a co-author invite link leads. Opening it never joins anyone by itself (link previews and
 * prefetches open URLs too): the visitor signs in, then confirms with a button.
 */
export default function InvitePage({ params }: PageProps<"/[locale]/invite/[token]">): ReactElement {
  return (
    <main className={styles.main}>
      <Suspense fallback={<SkeletonBlock height="12rem" />}>
        <InviteBody params={params} />
      </Suspense>
    </main>
  );
}
