import Link from "next/link";
import type { ReactElement } from "react";
import { siteConfig } from "@/lib/site";
import styles from "./SiteLogo.module.css";

export function SiteLogo(): ReactElement {
  return (
    <Link href="/" className={styles.logo} aria-label={`${siteConfig.name}, home`}>
      <span className={styles.mark} aria-hidden="true">
        .md
      </span>
      <span aria-hidden="true">store</span>
    </Link>
  );
}
