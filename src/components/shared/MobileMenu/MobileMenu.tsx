"use client";

import { useTranslations } from "next-intl";
import { Suspense, useEffect, useRef, type ReactElement } from "react";
import { LanguageSwitcher } from "@/components/shared/LanguageSwitcher/LanguageSwitcher";
import { Link } from "@/i18n/navigation";
import { useIsAdmin } from "@/lib/supabase/useIsAdmin";
import styles from "./MobileMenu.module.css";

interface MobileMenuLink {
  href: { pathname: string; hash?: string };
  label: string;
  /** Also shown in the header bar on wide screens, so the menu hides it there. */
  in_header_bar: boolean;
}

interface MobileMenuProps {
  links: MobileMenuLink[];
}

/**
 * Interface kind: native <details> disclosure in the header on every screen size. It closes after a
 * link is chosen, on Escape and on a click outside it. On narrow screens it holds every link and
 * the language switcher; on wide screens only the links the header bar has no room for, plus
 * "Reviews" for admins.
 */
export function MobileMenu({ links }: MobileMenuProps): ReactElement {
  const t = useTranslations("nav");
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const is_admin = useIsAdmin();

  function close(): void {
    if (detailsRef.current) detailsRef.current.open = false;
  }

  useEffect(() => {
    function close_when_outside(event: PointerEvent): void {
      const details = detailsRef.current;
      if (details?.open && event.target instanceof Node && !details.contains(event.target)) details.open = false;
    }
    function close_on_escape(event: KeyboardEvent): void {
      const details = detailsRef.current;
      if (event.key !== "Escape" || !details?.open) return;
      details.open = false;
      details.querySelector("summary")?.focus();
    }
    document.addEventListener("pointerdown", close_when_outside);
    document.addEventListener("keydown", close_on_escape);
    return () => {
      document.removeEventListener("pointerdown", close_when_outside);
      document.removeEventListener("keydown", close_on_escape);
    };
  }, []);

  return (
    <details ref={detailsRef} className={styles.menu}>
      <summary className={styles.toggle} aria-label={t("menu")} title={t("menu")}>
        <span className={styles.bars} aria-hidden="true" />
      </summary>
      <ul className={styles.panel}>
        {links.map((link) => (
          <li key={link.label} data-in-header-bar={link.in_header_bar}>
            <Link href={link.href} onClick={close}>
              {link.label}
            </Link>
          </li>
        ))}
        {is_admin && (
          <li>
            <Link href="/reviews" onClick={close}>
              {t("reviews")}
            </Link>
          </li>
        )}
        <li className={styles.language}>
          <Suspense fallback={null}>
            <LanguageSwitcher />
          </Suspense>
        </li>
      </ul>
    </details>
  );
}
