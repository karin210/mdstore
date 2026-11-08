import { useTranslations } from "next-intl";
import type { ReactElement } from "react";
import { LanguageSwitcher } from "@/components/global/LanguageSwitcher";
import { MobileMenu } from "@/components/global/MobileMenu";
import { navLinks } from "@/components/global/navLinks";
import { SiteLogo } from "@/components/global/SiteLogo";
import { Link } from "@/i18n/navigation";
import styles from "./SiteHeader.module.css";

export function SiteHeader(): ReactElement {
  const t = useTranslations("nav");
  const links = navLinks.map((link) => ({ href: link.href, label: t(link.key) }));

  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <SiteLogo />
        <div className={styles.actions}>
          <nav aria-label={t("main")}>
            <ul className={styles.links}>
              {links.map((link) => (
                <li key={link.label}>
                  <Link href={link.href}>{link.label}</Link>
                </li>
              ))}
            </ul>
            <div className={styles.mobile}>
              <MobileMenu links={links} />
            </div>
          </nav>
          <LanguageSwitcher />
        </div>
      </div>
    </header>
  );
}
