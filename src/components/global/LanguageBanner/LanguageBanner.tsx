"use client";

import { useLocale, useTranslations } from "next-intl";
import { useId, useState, useSyncExternalStore, type ReactElement } from "react";
import { Link, usePathname } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import styles from "./LanguageBanner.module.css";

/** Session flag: set once the visitor has answered the question (switched or dismissed). */
const storage_key = "mdstore_language_banner";

// sessionStorage is per tab and changes only from this page, so nothing needs to be subscribed to.
function subscribe_none(): () => void {
  return () => undefined;
}

function read_answered(): boolean {
  try {
    return sessionStorage.getItem(storage_key) !== null;
  } catch {
    // Storage blocked: the banner shows on each page until it is answered there.
    return false;
  }
}

// Hidden in the server HTML, so the first client render matches it.
function server_answered(): boolean {
  return true;
}

/**
 * One-off banner under the site header that asks whether to change the language. Answering in any
 * way (picking another language or dismissing) stores the answer in sessionStorage, so it stays
 * hidden for the rest of the tab's session.
 */
export function LanguageBanner(): ReactElement | null {
  const t_language = useTranslations("language");
  const t_banner = useTranslations("languageBanner");
  const current_locale = useLocale();
  const pathname = usePathname();
  const heading_id = useId();
  const answered_before = useSyncExternalStore(subscribe_none, read_answered, server_answered);
  const [answered_now, set_answered_now] = useState(false);

  function record_answer(): void {
    try {
      sessionStorage.setItem(storage_key, "answered");
    } catch {
      // Storage blocked: nothing to store, the banner is hidden for this page only.
    }
    set_answered_now(true);
  }

  if (answered_before || answered_now) return null;

  const other_locales = routing.locales.filter((locale) => locale !== current_locale);

  return (
    <aside className={styles.banner} aria-labelledby={heading_id}>
      <p id={heading_id} className={styles.prompt}>
        {t_banner("prompt")}
      </p>
      <ul className={styles.choices}>
        {other_locales.map((locale) => (
          <li key={locale}>
            <Link
              href={pathname}
              locale={locale}
              lang={locale}
              hrefLang={locale}
              className={styles.choice}
              onClick={record_answer}
            >
              {t_language(`${locale}.name`)}
            </Link>
          </li>
        ))}
      </ul>
      <button type="button" className={styles.close} aria-label={t_banner("close")} onClick={record_answer}>
        <span aria-hidden="true">×</span>
      </button>
    </aside>
  );
}
