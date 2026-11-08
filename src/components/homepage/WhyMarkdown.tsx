import { useTranslations } from "next-intl";
import type { ReactElement } from "react";
import styles from "./WhyMarkdown.module.css";

const reasonKeys = ["readable", "adaptable", "toolAgnostic", "versioned"] as const;

export function WhyMarkdown(): ReactElement {
  const t = useTranslations("home.whyMarkdown");

  return (
    <section className="page-section" aria-labelledby="why-title">
      <header className="section-heading">
        <p className="eyebrow">{t("eyebrow")}</p>
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
