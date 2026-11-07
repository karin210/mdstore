import type { ReactElement, ReactNode } from "react";
import styles from "./SecondaryButton.module.css";

interface SecondaryButtonProps {
  href: string;
  children: ReactNode;
  size?: "default" | "large";
}

/**
 * Secondary kind: purchase follow-ups, customer acquisition (sign in / sign up,
 * become a seller) and contact buttons.
 */
export function SecondaryButton({ href, children, size = "default" }: SecondaryButtonProps): ReactElement {
  return (
    <a href={href} className={styles.button} data-size={size}>
      {children}
    </a>
  );
}
