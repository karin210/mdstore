"use client";

import { useTranslations } from "next-intl";
import { useRef, type ReactElement } from "react";
import { Link } from "@/i18n/navigation";
import styles from "./MobileMenu.module.css";

interface MobileMenuLink {
  href: { pathname: string; hash?: string };
  label: string;
}

interface MobileMenuProps {
  links: MobileMenuLink[];
}

/** Interface kind: native <details> disclosure that closes itself after a link is chosen. */
export function MobileMenu({ links }: MobileMenuProps): ReactElement {
  const t = useTranslations("nav");
  const detailsRef = useRef<HTMLDetailsElement>(null);

  function close(): void {
    if (detailsRef.current) detailsRef.current.open = false;
  }

  return (
    <details ref={detailsRef} className={styles.menu}>
      <summary className={styles.toggle} aria-label={t("menu")} title={t("menu")}>
        <span className={styles.bars} aria-hidden="true" />
      </summary>
      <ul className={styles.panel}>
        {links.map((link) => (
          <li key={link.label}>
            <Link href={link.href} onClick={close}>
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </details>
  );
}
