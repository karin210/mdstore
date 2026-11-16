"use client";

import { useTranslations } from "next-intl";
import { useMemo, useRef, type ReactElement } from "react";
import { useActiveSection } from "@/lib/useActiveSection";
import modal_styles from "@/styles/modal.module.css";
import utility_styles from "@/styles/utilities.module.css";
import styles from "./RouteIndex.module.css";

const ROUTE_INDEX_POPOVER_ID = "route-index";

/** One entry of a route's index: the id of an element on the page, its label and its Markdown heading level. */
export interface RouteIndexSection {
  id: string;
  label: string;
  level: 1 | 2;
}

interface RouteIndexProps {
  /** The route's sections in reading order. Each `id` is an element on the page; it need not be a <section>. */
  sections: RouteIndexSection[];
  /** The Markdown file the route reads as, shown above the list (e.g. `home.md`). */
  file_name: string;
}

interface OutlineListProps {
  sections: RouteIndexSection[];
  activeId: string | null;
  onNavigate?: () => void;
}

/** The page's sections as Markdown headings; the one being read carries `aria-current`. */
function OutlineList({ sections, activeId, onNavigate }: OutlineListProps): ReactElement {
  return (
    <ol className={styles.list}>
      {sections.map((section) => (
        <li key={section.id}>
          <a
            href={`#${section.id}`}
            className={styles.link}
            data-level={section.level}
            aria-current={activeId === section.id ? "location" : undefined}
            onClick={onNavigate}
          >
            <span className={styles.marker} aria-hidden="true">
              {"#".repeat(section.level)}
            </span>
            {section.label}
          </a>
        </li>
      ))}
    </ol>
  );
}

/** The ids of the sections, stable between renders so the scroll listener is not re-attached each time. */
function useSectionIds(sections: RouteIndexSection[]): string[] {
  return useMemo(() => sections.map((section) => section.id), [sections]);
}

/**
 * Wide screens: a sticky outline beside the page, like an editor's outline of the route's `.md` file.
 * Global control: it shows the whole map, marks where the reader is, and its line fills as the page is read.
 */
export function RouteIndexRail({ sections, file_name }: RouteIndexProps): ReactElement {
  const t = useTranslations("routeIndex");
  const section_ids = useSectionIds(sections);
  const activeId = useActiveSection(section_ids) ?? section_ids[0];

  return (
    <nav className={styles.rail} aria-label={t("label")}>
      <div className={styles.railInner}>
        <p className={styles.fileName}>{file_name}</p>
        <div className={styles.railBody}>
          <span className={styles.railTrack} aria-hidden="true" />
          <OutlineList sections={sections} activeId={activeId} />
        </div>
      </div>
    </nav>
  );
}

/**
 * Narrow screens: an editor-style status bar pinned to the bottom of the page, naming the section being
 * read and opening the full outline in a native popover (Escape or an outside click closes it).
 */
export function RouteIndexStatusBar({ sections, file_name }: RouteIndexProps): ReactElement {
  const t = useTranslations("routeIndex");
  const section_ids = useSectionIds(sections);
  const activeId = useActiveSection(section_ids) ?? section_ids[0];
  const activeSection = sections.find((section) => section.id === activeId) ?? sections[0];
  const popoverRef = useRef<HTMLDivElement>(null);

  return (
    <div className={styles.statusBar}>
      <p className={styles.location}>
        <span className={styles.fileName}>{file_name}</span>
        <span aria-hidden="true">›</span>
        <span className={styles.marker} aria-hidden="true">
          {"#".repeat(activeSection.level)}
        </span>
        <span className={styles.current}>
          <span className={utility_styles.visuallyHidden}>{t("reading")} </span>
          {activeSection.label}
        </span>
      </p>
      <button type="button" className={styles.outlineButton} popoverTarget={ROUTE_INDEX_POPOVER_ID}>
        {t("open")}
      </button>

      <div id={ROUTE_INDEX_POPOVER_ID} popover="auto" ref={popoverRef} className={styles.sheet}>
        <nav className={styles.sheetBody} aria-label={t("label")}>
          <p className={styles.fileName}>{file_name}</p>
          <OutlineList sections={sections} activeId={activeId} onNavigate={() => popoverRef.current?.hidePopover()} />
        </nav>
        <button
          type="button"
          className={modal_styles.closeFloating}
          popoverTarget={ROUTE_INDEX_POPOVER_ID}
          popoverTargetAction="hide"
          aria-label={t("close")}
          title={t("close")}
        >
          <span aria-hidden="true">×</span>
        </button>
      </div>
    </div>
  );
}
