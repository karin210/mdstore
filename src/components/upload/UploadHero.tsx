import { useTranslations } from "next-intl";
import type { ReactElement } from "react";
import { SecondaryButton } from "@/components/global/SecondaryButton";
import styles from "./UploadHero.module.css";

export function UploadHero(): ReactElement {
  const t = useTranslations("upload.hero");

  return (
    <section className={styles.hero} aria-labelledby="upload-hero-title">
      <div className={styles.copy}>
        <p className="eyebrow">{t("eyebrow")}</p>
        <h1 id="upload-hero-title" className={styles.title}>
          {t("title")}
        </h1>
        <p className={styles.lead}>{t("lead")}</p>
        <div className={styles.actions}>
          {/* Leads to the form at the bottom of the page */}
          <SecondaryButton href="#post-prompt" size="large">
            {t("action")}
          </SecondaryButton>
          {/* Tertiary kind: informational link with no acquisition intent */}
          <a href="#benefits" className={styles.learnMore}>
            {t("learnMore")}
          </a>
        </div>
        <p className={styles.note}>{t("note")}</p>
      </div>
    </section>
  );
}
