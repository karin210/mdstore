import { useTranslations } from "next-intl";
import type { ReactElement } from "react";
import { SkeletonBlock } from "@/components/global/SkeletonBlock";
import styles from "./PromptDetail.module.css";

/** Loading placeholder for PromptDetail; reuses its grid so the page doesn't jump when the listing arrives. */
export function PromptDetailSkeleton(): ReactElement {
  const t = useTranslations("promptDetail");

  return (
    <div className={styles.skeleton} aria-busy="true">
      <p role="status" className="visually-hidden">
        {t("loading")}
      </p>

      <SkeletonBlock width="12rem" height="var(--text-sm)" />

      <div className={styles.layout}>
        <div className={styles.header}>
          <SkeletonBlock width="10rem" height="var(--text-sm)" />
          <SkeletonBlock width="min(30rem, 90%)" height="var(--text-3xl)" />
          <SkeletonBlock width="min(36rem, 100%)" height="var(--text-xl)" />
        </div>

        <div className={styles.summarySection}>
          <SkeletonBlock width="7rem" height="var(--text-xl)" />
          <SkeletonBlock height="var(--text-lg)" />
          <SkeletonBlock width="80%" height="var(--text-lg)" />
        </div>

        <div className={styles.meantForSection}>
          <SkeletonBlock width="6rem" height="var(--text-xl)" />
          <SkeletonBlock width="min(24rem, 100%)" height="1.75rem" rounded />
        </div>

        <div className={styles.highlightsSection}>
          <SkeletonBlock width="8rem" height="var(--text-xl)" />
          <SkeletonBlock width="90%" />
          <SkeletonBlock width="75%" />
          <SkeletonBlock width="85%" />
        </div>

        <div className={styles.purchase}>
          <SkeletonBlock width="5rem" height="var(--text-2xl)" />
          <SkeletonBlock height="8rem" />
          <SkeletonBlock height="2.75rem" rounded />
        </div>

        <div className={styles.examples}>
          <SkeletonBlock width="11rem" height="var(--text-xl)" />
        </div>

        <div className={styles.preview}>
          <SkeletonBlock width="9rem" height="var(--text-xl)" />
          <SkeletonBlock height="16rem" />
        </div>

        <div className={styles.usageSection}>
          <SkeletonBlock width="9rem" height="var(--text-xl)" />
          <SkeletonBlock width="85%" />
          <SkeletonBlock width="70%" />
        </div>
      </div>
    </div>
  );
}
