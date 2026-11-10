import { useTranslations } from "next-intl";
import type { ReactElement } from "react";
import { navLinks } from "@/components/global/navLinks";
import { SiteLogo } from "@/components/global/SiteLogo";
import { Link } from "@/i18n/navigation";
import { siteConfig } from "@/lib/site";
import styles from "./SiteFooter.module.css";

export function SiteFooter(): ReactElement {
  const t = useTranslations();
  const name = siteConfig.name;

  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <section className={styles.brand} aria-label={t("footer.about", { name })}>
          <SiteLogo />
          <p>{t("footer.blurb", { tagline: t("brand.tagline") })}</p>
        </section>
        <nav aria-label={t("nav.footer")}>
          <ul className={styles.links}>
            {navLinks.map((link) => (
              <li key={link.key}>
                <Link href={link.href}>{t(`nav.${link.key}`)}</Link>
              </li>
            ))}
            <li>
              <a href={`mailto:${siteConfig.contactEmail}`}>{t("nav.contact")}</a>
            </li>
          </ul>
        </nav>
      </div>
      <p className={styles.legal}>{t("footer.legal", { year: siteConfig.copyrightYear, name })}</p>
    </footer>
  );
}
