import { useTranslations } from "next-intl";
import type { ReactElement } from "react";
import { getNextSection } from "@/components/homepage/homeSections/homeSections";
import { Link } from "@/i18n/navigation";
import styles from "./NextSection.module.css";

/**
 * Context control at the end of a landing section: the way to the next thing to read. After the last
 * section it leads to the upload page, the end of the author journey.
 */
export function NextSection({ from }: { from: string }): ReactElement {
  const t = useTranslations("home.outline");
  const nextSection = getNextSection(from);

  if (!nextSection) {
    return (
      <p className={styles.next}>
        <Link href="/upload" className={styles.link}>
          <span className={styles.label}>{t("next")}</span>
          <span className={styles.target}>{t("finalNext")}</span>
          <span className={styles.arrow} aria-hidden="true">
            →
          </span>
        </Link>
      </p>
    );
  }

  return (
    <p className={styles.next}>
      <a href={`#${nextSection.id}`} className={styles.link}>
        <span className={styles.label}>{t("next")}</span>
        <span className={styles.target}>
          <span className={styles.marker} aria-hidden="true">
            {"#".repeat(nextSection.level)}
          </span>
          {t(`sections.${nextSection.key}`)}
        </span>
        <span className={styles.arrow} aria-hidden="true">
          ↓
        </span>
      </a>
    </p>
  );
}
