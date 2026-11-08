import { useTranslations } from "next-intl";
import type { ReactElement } from "react";
import { SecondaryButton } from "@/components/global/SecondaryButton";
import { Link } from "@/i18n/navigation";
import { siteConfig } from "@/lib/site";
import styles from "./SellClosing.module.css";

export function SellClosing(): ReactElement {
  const t = useTranslations("sell.closing");
  const tHero = useTranslations("sell.hero");
  const mailto = `mailto:${siteConfig.sellerContactEmail}?subject=${encodeURIComponent(tHero("mailSubject"))}`;

  return (
    <section className={styles.wrapper} aria-labelledby="sell-closing-title">
      <div className={styles.panel}>
        <h2 id="sell-closing-title" className={styles.title}>
          {t("title")}
        </h2>
        <p className={styles.text}>{t("text")}</p>
        <div className={styles.actions}>
          <SecondaryButton href={mailto} size="large">
            {t("action")}
          </SecondaryButton>
          {/* Tertiary kind: informational link with no acquisition intent */}
          <Link href={{ pathname: "/", hash: "featured" }} className={styles.back}>
            {t("back")}
          </Link>
        </div>
      </div>
    </section>
  );
}
