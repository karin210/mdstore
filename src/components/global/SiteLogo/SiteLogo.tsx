import { useTranslations } from "next-intl";
import type { ReactElement } from "react";
import { Link } from "@/i18n/navigation";
import { siteConfig } from "@/lib/site";
import styles from "./SiteLogo.module.css";

/**
 * The brand: a Markdown file tile (folded corner, "#" heading mark) beside the "mdstore" wordmark.
 * It always sits on the site chrome; its colours come from the chrome tokens, so it follows the theme.
 * The link carries the accessible name; the drawing and the wordmark are hidden from assistive tech.
 */
export function SiteLogo(): ReactElement {
  const t = useTranslations("brand");

  return (
    <Link href="/" className={styles.logo} aria-label={t("homeLink", { name: siteConfig.name })}>
      <svg className={styles.mark} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path className={styles.tile} d="M6 2h9l5 5v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Z" />
        <path className={styles.fold} d="M15 2v4a1 1 0 0 0 1 1h4Z" />
        <path className={styles.glyph} d="M9.75 10.5 8.75 18.5M13.25 10.5l-1 8M7.5 13h7M7 16h7" />
      </svg>
      <span className={styles.word} aria-hidden="true">
        <span className={styles.md}>md</span>store
      </span>
    </Link>
  );
}
