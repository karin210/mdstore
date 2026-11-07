import Link from "next/link";
import type { ReactElement, ReactNode } from "react";
import styles from "./PrimaryButton.module.css";

interface PrimaryButtonProps {
  href: string;
  children: ReactNode;
  /** Visual size; the shape adapts to the context it is used in. */
  size?: "default" | "large";
}

/** Primary kind: purchase-related CTAs (hero CTA, buy buttons). */
export function PrimaryButton({ href, children, size = "default" }: PrimaryButtonProps): ReactElement {
  return (
    <Link href={href} className={styles.button} data-size={size}>
      {children}
    </Link>
  );
}
