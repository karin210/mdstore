import { useTranslations } from "next-intl";
import type { ReactElement } from "react";
import { faqEntryIds } from "@/data/faq";
import styles from "./Faq.module.css";

export function Faq(): ReactElement {
  const t = useTranslations("home.faq");

  return (
    <section id="faq" className="page-section" aria-labelledby="faq-title">
      <header className="section-heading">
        <p className="eyebrow">{t("eyebrow")}</p>
        <h2 id="faq-title">{t("title")}</h2>
      </header>
      <div className={styles.list}>
        {faqEntryIds.map((id) => (
          <details key={id} className={styles.item} name="faq">
            <summary className={styles.question}>{t(`entries.${id}.question`)}</summary>
            <p className={styles.answer}>{t(`entries.${id}.answer`)}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
