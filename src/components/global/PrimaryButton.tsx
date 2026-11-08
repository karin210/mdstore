import { useLocale } from "next-intl";
import type { ComponentProps, ReactElement, ReactNode } from "react";
import { getPathname, Link } from "@/i18n/navigation";
import styles from "./PrimaryButton.module.css";

interface PrimaryButtonProps {
  /** Locale-aware target; a download target is a plain path like "/prompts/global/download". */
  href: ComponentProps<typeof Link>["href"];
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
  const locale = useLocale();

  // A download is a plain anchor: client-side routing would try to render the file as a page.
  if (download) {
    return (
      <a
        href={getPathname({ href: href as string, locale })}
        download
        className={styles.button}
        data-size={size}
        aria-label={ariaLabel}
      >
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
