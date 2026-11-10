import { useTranslations } from "next-intl";
import type { ReactElement } from "react";
import { SecondaryButton } from "@/components/global/SecondaryButton";
import styles from "./UploadCta.module.css";

const perkKeys = ["ownPage", "freePreviews", "credit", "plainMarkdown"] as const;

/** Landing-page invitation for authors to post their prompts on /upload. */
export function UploadCta(): ReactElement {
  const t = useTranslations("home.uploadCta");

  return (
    <section id="upload" className={styles.wrapper} aria-labelledby="upload-cta-title">
      <div className={styles.panel}>
        <div className={styles.copy}>
          <p className="eyebrow">{t("eyebrow")}</p>
          <h2 id="upload-cta-title" className={styles.title}>
            {t("title")}
          </h2>
          <p className={styles.lead}>{t("lead")}</p>
          <SecondaryButton href="/upload" size="large">
            {t("action")}
          </SecondaryButton>
        </div>
        <ul className={styles.perks}>
          {perkKeys.map((key) => (
            <li key={key}>{t(`perks.${key}`)}</li>
          ))}
        </ul>
      </div>
    </section>
  );
}
