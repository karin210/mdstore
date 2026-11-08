import { useTranslations } from "next-intl";
import type { ReactElement } from "react";
import { SecondaryButton } from "@/components/global/SecondaryButton";
import { siteConfig } from "@/lib/site";
import styles from "./SellHero.module.css";

export function SellHero(): ReactElement {
  const t = useTranslations("sell.hero");
  const mailto = `mailto:${siteConfig.sellerContactEmail}?subject=${encodeURIComponent(t("mailSubject"))}`;

  return (
    <section className={styles.hero} aria-labelledby="sell-hero-title">
      <div className={styles.copy}>
        <p className="eyebrow">{t("eyebrow")}</p>
        <h1 id="sell-hero-title" className={styles.title}>
          {t("title")}
        </h1>
        <p className={styles.lead}>{t("lead")}</p>
        <div className={styles.actions}>
          <SecondaryButton href={mailto} size="large">
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
