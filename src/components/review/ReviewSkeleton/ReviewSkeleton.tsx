import { useTranslations } from "next-intl";
import type { ReactElement } from "react";
import { SkeletonBlock } from "@/components/global/SkeletonBlock/SkeletonBlock";
import review_page_styles from "@/styles/reviewPage.module.css";
import utility_styles from "@/styles/utilities.module.css";

/** Placeholder with the review page's shape while the session and the review load. */
export function ReviewSkeleton(): ReactElement {
  const t = useTranslations("review");

  return (
    <div className={review_page_styles.page} aria-busy="true">
      <p role="status" className={utility_styles.visuallyHidden}>
        {t("loading")}
      </p>
      <SkeletonBlock width="12rem" height="var(--text-sm)" />
      <div className={review_page_styles.header}>
        <SkeletonBlock width="8rem" height="var(--text-sm)" />
        <SkeletonBlock width="min(30rem, 90%)" height="var(--text-2xl)" />
        <SkeletonBlock width="16rem" height="var(--text-sm)" />
      </div>
      <div className={review_page_styles.layout}>
        <div className={review_page_styles.content}>
          <SkeletonBlock width="min(28rem, 100%)" height="2.5rem" rounded />
          <SkeletonBlock height="6rem" />
          <SkeletonBlock height="6rem" />
        </div>
        <div className={review_page_styles.sidebar}>
          <SkeletonBlock height="10rem" />
        </div>
      </div>
    </div>
  );
}
