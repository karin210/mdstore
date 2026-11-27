import { useTranslations } from "next-intl";
import type { ReactElement } from "react";
import section_styles from "@/styles/section.module.css";
import styles from "./UploadSteps.module.css";

const stepIds = ["signIn", "send", "feedback", "testing", "live"] as const;

/** How a post goes live: sign in, send the form, review feedback, staff testing, then live. */
export function UploadSteps(): ReactElement {
  const t = useTranslations("upload.steps");

  return (
    <section id="steps" className={section_styles.pageSection} aria-labelledby="upload-steps-title">
      <header className={section_styles.sectionHeading}>
        <p className={section_styles.eyebrow}>{t("eyebrow")}</p>
        <h2 id="upload-steps-title">{t("title")}</h2>
      </header>
      <ol className={styles.steps}>
        {stepIds.map((id) => (
          <li key={id} className={styles.step}>
            <strong>{t(`items.${id}.title`)}</strong>
            <span>{t(`items.${id}.text`)}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}
