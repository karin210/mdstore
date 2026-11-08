"use client";

import { useLocale, useTranslations } from "next-intl";
import type { ReactElement } from "react";
import { Link, usePathname } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import styles from "./LanguageSwitcher.module.css";

/**
 * Interface kind: one entry per locale. The current one is marked with aria-current; the others
 * link to the same page in that language (next-intl also stores the choice in a cookie).
 */
export function LanguageSwitcher(): ReactElement {
  const t = useTranslations("language");
  const current = useLocale();
  const pathname = usePathname();

  return (
    <ul className={styles.list} aria-label={t("label")}>
      {routing.locales.map((locale) => (
        <li key={locale}>
          {locale === current ? (
            <span className={styles.item} aria-current="true" lang={locale} title={t(`${locale}.name`)}>
              {t(`${locale}.short`)}
            </span>
          ) : (
            <Link
              href={pathname}
              locale={locale}
              lang={locale}
              hrefLang={locale}
              className={styles.item}
              aria-label={t(`${locale}.switchTo`)}
              title={t(`${locale}.name`)}
            >
              {t(`${locale}.short`)}
            </Link>
          )}
        </li>
      ))}
    </ul>
  );
}
