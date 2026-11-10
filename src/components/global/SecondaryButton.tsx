import type { ComponentProps, ReactElement, ReactNode } from "react";
import { Link } from "@/i18n/navigation";
import styles from "./SecondaryButton.module.css";

interface SecondaryButtonProps {
  /** Locale-aware page target, or a plain `mailto:` / in-page `#hash` string. */
  href: ComponentProps<typeof Link>["href"];
  children: ReactNode;
  size?: "default" | "large";
}

/** Plain targets that must not get a locale prefix or client-side routing. */
function is_plain_target(href: SecondaryButtonProps["href"]): href is string {
  return typeof href === "string" && (href.startsWith("mailto:") || href.startsWith("#"));
}

/**
 * Secondary kind: purchase follow-ups, customer acquisition (sign in / sign up,
 * upload a prompt) and contact buttons.
 */
export function SecondaryButton({ href, children, size = "default" }: SecondaryButtonProps): ReactElement {
  if (is_plain_target(href)) {
    return (
      <a href={href} className={styles.button} data-size={size}>
        {children}
      </a>
    );
  }

  return (
    <Link href={href} className={styles.button} data-size={size}>
      {children}
    </Link>
  );
}
