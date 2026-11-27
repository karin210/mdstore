import { useTranslations } from "next-intl";
import type { ReactElement } from "react";
import section_styles from "@/styles/section.module.css";

/** A reminder before the form: test the file for real, and take screenshots of what it produced. */
export function UploadListingTips(): ReactElement {
  const t = useTranslations("upload.listing");

  return (
    <section id="listing-tips" className={section_styles.pageSection} aria-labelledby="listing-tips-title">
      <header className={section_styles.sectionHeading}>
        <p className={section_styles.eyebrow}>{t("eyebrow")}</p>
        <h2 id="listing-tips-title">{t("title")}</h2>
        <p>{t("lead")}</p>
      </header>
    </section>
  );
}
