import type { ReactElement, ReactNode } from "react";
import { RouteIndexRail, RouteIndexStatusBar, type RouteIndexSection } from "@/components/shared/RouteIndex/RouteIndex";
import styles from "./RouteIndexLayout.module.css";

interface RouteIndexLayoutProps {
  /** The route's sections in reading order; every multi-section route passes its own. */
  sections: RouteIndexSection[];
  /** The Markdown file the route reads as (e.g. `home.md`), shown above the index. */
  file_name: string;
  /** The page's own class for the content column: its direction, gap and bottom padding. */
  content_class_name?: string;
  children: ReactNode;
}

/**
 * The <main> of a multi-section route: the sticky index rail beside the content on wide screens and
 * the status bar at the end of the content on narrow ones. The content spans the full width (so a
 * hero can be full-bleed) and the rail sits in its own column, as tall as the page, so it follows the
 * reader all the way down.
 */
export function RouteIndexLayout({
  sections,
  file_name,
  content_class_name,
  children,
}: RouteIndexLayoutProps): ReactElement {
  const content_class = content_class_name ? `${styles.content} ${content_class_name}` : styles.content;

  return (
    <main className={styles.main}>
      <RouteIndexRail sections={sections} file_name={file_name} />
      <div className={content_class}>
        {children}
        <RouteIndexStatusBar sections={sections} file_name={file_name} />
      </div>
    </main>
  );
}
