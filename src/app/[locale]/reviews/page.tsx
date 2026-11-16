import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Suspense, type ReactElement } from "react";
import { SkeletonBlock } from "@/components/global/SkeletonBlock";
import { ReviewQueue } from "@/components/review/ReviewQueue";
import styles from "./page.module.css";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("review.meta");
  return { title: t("queueTitle"), robots: { index: false, follow: false } };
}

/**
 * The admins' review queue. It reads the session, so the list renders inside <Suspense>;
 * src/proxy.ts answers 404 before rendering for everyone who isn't an admin.
 */
export default function ReviewsPage(): ReactElement {
  return (
    <main className={styles.main}>
      <Suspense fallback={<SkeletonBlock height="12rem" />}>
        <ReviewQueue />
      </Suspense>
    </main>
  );
}
