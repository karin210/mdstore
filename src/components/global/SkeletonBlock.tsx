import type { CSSProperties, ReactElement } from "react";
import styles from "./SkeletonBlock.module.css";

interface SkeletonBlockProps {
  /** Any CSS length; defaults to the full width of the parent. */
  width?: string;
  /** Any CSS length; defaults to one line of text. */
  height?: string;
  /** Pill-shaped ends, for tags and buttons. */
  rounded?: boolean;
}

/** Shimmering placeholder for content that is still loading. Decorative: announce loading on the region. */
export function SkeletonBlock({ width = "100%", height = "1em", rounded = false }: SkeletonBlockProps): ReactElement {
  const size: CSSProperties = { width, height };

  return <span className={styles.block} style={size} data-rounded={rounded} aria-hidden="true" />;
}
