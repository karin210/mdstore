import { useTranslations } from "next-intl";
import type { ReactElement } from "react";
import styles from "./UploadSteps.module.css";

const stepIds = ["signIn", "describe", "publish"] as const;

export function UploadSteps(): ReactElement {
  const t = useTranslations("upload.steps");

  return (
    <section className="page-section" aria-labelledby="upload-steps-title">
      <header className="section-heading">
        <p className="eyebrow">{t("eyebrow")}</p>
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
