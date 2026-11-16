import { useTranslations } from "next-intl";
import type { ReactElement } from "react";
import { SkeletonBlock } from "@/components/global/SkeletonBlock/SkeletonBlock";
import styles from "@/components/review/shared/Review.module.css";

/** Placeholder with the review page's shape while the session and the review load. */
export function ReviewSkeleton(): ReactElement {
  const t = useTranslations("review");

  return (
    <div className={styles.page} aria-busy="true">
      <p role="status" className="visually-hidden">
        {t("loading")}
      </p>
      <SkeletonBlock width="12rem" height="var(--text-sm)" />
      <div className={styles.header}>
        <SkeletonBlock width="8rem" height="var(--text-sm)" />
        <SkeletonBlock width="min(30rem, 90%)" height="var(--text-2xl)" />
        <SkeletonBlock width="16rem" height="var(--text-sm)" />
      </div>
      <div className={styles.layout}>
        <div className={styles.content}>
          <SkeletonBlock width="min(28rem, 100%)" height="2.5rem" rounded />
          <SkeletonBlock height="6rem" />
          <SkeletonBlock height="6rem" />
        </div>
        <div className={styles.sidebar}>
          <SkeletonBlock height="10rem" />
        </div>
      </div>
    </div>
  );
}
