import { useTranslations } from "next-intl";
import { Suspense, type ReactElement } from "react";
import { AccountControl } from "@/components/shared/AccountControl/AccountControl";
import { LanguageSwitcher } from "@/components/shared/LanguageSwitcher/LanguageSwitcher";
import { MobileMenu } from "@/components/shared/MobileMenu/MobileMenu";
import { navLinks } from "@/components/shared/navLinks/navLinks";
import { SiteLogo } from "@/components/shared/SiteLogo/SiteLogo";
import { Link } from "@/i18n/navigation";
import styles from "./SiteHeader.module.css";

export function SiteHeader(): ReactElement {
  const t = useTranslations("nav");
  const links = navLinks.map((link) => ({ href: link.href, label: t(link.key), in_header_bar: link.in_header_bar }));

  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <SiteLogo />
        <div className={styles.actions}>
          <nav aria-label={t("main")} className={styles.mainNav}>
            <ul className={styles.links}>
              {links
                .filter((link) => link.in_header_bar)
                .map((link) => (
                  <li key={link.label}>
                    <Link href={link.href}>{link.label}</Link>
                  </li>
                ))}
            </ul>
          </nav>
          <div className={styles.language}>
            {/* Reads the URL, which routes with unknown params (a posted prompt's slug) only have at runtime. */}
            <Suspense fallback={<span className={styles.languagePlaceholder} aria-hidden="true" />}>
              <LanguageSwitcher />
            </Suspense>
          </div>
          <div className={styles.account}>
            <AccountControl />
          </div>
          <nav aria-label={t("menu")}>
            <MobileMenu links={links} />
          </nav>
        </div>
      </div>
    </header>
  );
}
