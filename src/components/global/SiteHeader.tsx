import type { ReactElement } from "react";
import { MobileMenu } from "@/components/global/MobileMenu";
import { navLinks } from "@/components/global/navLinks";
import { SiteLogo } from "@/components/global/SiteLogo";
import styles from "./SiteHeader.module.css";

export function SiteHeader(): ReactElement {
  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <SiteLogo />
        <nav aria-label="Main">
          <ul className={styles.links}>
            {navLinks.map((link) => (
              <li key={link.href}>
                <a href={link.href}>{link.label}</a>
              </li>
            ))}
          </ul>
          <div className={styles.mobile}>
            <MobileMenu links={navLinks} />
          </div>
        </nav>
      </div>
    </header>
  );
}
