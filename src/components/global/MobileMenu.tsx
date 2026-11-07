"use client";

import { useRef, type ReactElement } from "react";
import type { NavLink } from "@/components/global/navLinks";
import styles from "./MobileMenu.module.css";

interface MobileMenuProps {
  links: NavLink[];
}

/** Interface kind: native <details> disclosure that closes itself after a link is chosen. */
export function MobileMenu({ links }: MobileMenuProps): ReactElement {
  const detailsRef = useRef<HTMLDetailsElement>(null);

  function close(): void {
    if (detailsRef.current) detailsRef.current.open = false;
  }

  return (
    <details ref={detailsRef} className={styles.menu}>
      <summary className={styles.toggle} aria-label="Menu" title="Menu">
        <span className={styles.bars} aria-hidden="true" />
      </summary>
      <ul className={styles.panel}>
        {links.map((link) => (
          <li key={link.href}>
            <a href={link.href} onClick={close}>
              {link.label}
            </a>
          </li>
        ))}
      </ul>
    </details>
  );
}
