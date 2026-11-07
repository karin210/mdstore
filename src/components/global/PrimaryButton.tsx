import Link from "next/link";
import type { ReactElement, ReactNode } from "react";
import styles from "./PrimaryButton.module.css";

interface PrimaryButtonProps {
  href: string;
  children: ReactNode;
  /** Visual size; the shape adapts to the context it is used in. */
  size?: "small" | "default" | "large";
  /** Downloads the target file instead of navigating to a page. */
  download?: boolean;
  "aria-label"?: string;
}

/** Primary kind: purchase-related CTAs (hero CTA, buy and get-the-file buttons). */
export function PrimaryButton({
  href,
  children,
  size = "default",
  download = false,
  "aria-label": ariaLabel,
}: PrimaryButtonProps): ReactElement {
  // A download is a plain anchor: client-side routing would try to render the file as a page.
  if (download) {
    return (
      <a href={href} download className={styles.button} data-size={size} aria-label={ariaLabel}>
        {children}
      </a>
    );
  }

  return (
    <Link href={href} className={styles.button} data-size={size} aria-label={ariaLabel}>
      {children}
    </Link>
  );
}
