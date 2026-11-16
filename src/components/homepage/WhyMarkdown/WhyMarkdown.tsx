import { useTranslations } from "next-intl";
import type { ReactElement } from "react";
import section_styles from "@/styles/section.module.css";
import styles from "./WhyMarkdown.module.css";

const reasonKeys = ["readable", "adaptable", "toolAgnostic", "versioned"] as const;

export function WhyMarkdown(): ReactElement {
  const t = useTranslations("home.whyMarkdown");

  return (
    <section id="why-markdown" className={section_styles.pageSection} aria-labelledby="why-title">
      <header className={section_styles.sectionHeading} data-md-level="2">
        <p className={section_styles.eyebrow}>{t("eyebrow")}</p>
        <h2 id="why-title">{t("title")}</h2>
        <p>{t("lead")}</p>
      </header>
      <ul className={styles.grid}>
        {reasonKeys.map((key) => (
          <li key={key} className={styles.reason}>
            <h3>{t(`reasons.${key}.title`)}</h3>
            <p>{t(`reasons.${key}.text`)}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
