import { useTranslations } from "next-intl";
import type { ReactElement } from "react";
import styles from "./SellSteps.module.css";

const stepIds = ["write", "talk", "publish"] as const;

export function SellSteps(): ReactElement {
  const t = useTranslations("sell.steps");

  return (
    <section className="page-section" aria-labelledby="sell-steps-title">
      <header className="section-heading">
        <p className="eyebrow">{t("eyebrow")}</p>
        <h2 id="sell-steps-title">{t("title")}</h2>
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
