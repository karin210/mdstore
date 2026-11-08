import { useTranslations } from "next-intl";
import type { ReactElement } from "react";
import { SecondaryButton } from "@/components/global/SecondaryButton";
import { siteConfig } from "@/lib/site";
import styles from "./SellerCta.module.css";

const perkKeys = ["ownPrice", "paidPerSale", "freePreviews", "updates"] as const;

export function SellerCta(): ReactElement {
  const t = useTranslations("home.sellerCta");
  const mailto = `mailto:${siteConfig.sellerContactEmail}?subject=${encodeURIComponent(t("mailSubject"))}`;

  return (
    <section id="sell" className={styles.wrapper} aria-labelledby="sell-title">
      <div className={styles.panel}>
        <div className={styles.copy}>
          <p className="eyebrow">{t("eyebrow")}</p>
          <h2 id="sell-title" className={styles.title}>
            {t("title")}
          </h2>
          <p className={styles.lead}>{t("lead")}</p>
          <SecondaryButton href={mailto} size="large">
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
