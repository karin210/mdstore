import { useTranslations } from "next-intl";
import type { ReactElement } from "react";
import { Link } from "@/i18n/navigation";
import { siteConfig } from "@/lib/site";
import styles from "./SiteLogo.module.css";

export function SiteLogo(): ReactElement {
  const t = useTranslations("brand");

  return (
    <Link href="/" className={styles.logo} aria-label={t("homeLink", { name: siteConfig.name })}>
      <span className={styles.mark} aria-hidden="true">
        .md
      </span>
      <span aria-hidden="true">store</span>
    </Link>
  );
}
