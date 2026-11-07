import type { ReactElement } from "react";
import { navLinks } from "@/components/global/navLinks";
import { SiteLogo } from "@/components/global/SiteLogo";
import { siteConfig } from "@/lib/site";
import styles from "./SiteFooter.module.css";

export function SiteFooter(): ReactElement {
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <section className={styles.brand} aria-label={`About ${siteConfig.name}`}>
          <SiteLogo />
          <p>{siteConfig.tagline}. Plain Markdown, written by developers, for developers.</p>
        </section>
        <nav aria-label="Footer">
          <ul className={styles.links}>
            {navLinks.map((link) => (
              <li key={link.href}>
                <a href={link.href}>{link.label}</a>
              </li>
            ))}
            <li>
              <a href={`mailto:${siteConfig.sellerContactEmail}`}>Contact</a>
            </li>
          </ul>
        </nav>
      </div>
      <p className={styles.legal}>
        © {siteConfig.copyrightYear} {siteConfig.name}. Prompts remain the property of their authors.
      </p>
    </footer>
  );
}
