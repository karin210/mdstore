"use client";

import { useTranslations } from "next-intl";
import { useRef, type ReactElement } from "react";
import { homeSections } from "@/components/homepage/homeSections/homeSections";
import { useActiveSection } from "@/lib/useActiveSection";
import styles from "./HomeOutline.module.css";

const SECTION_IDS = homeSections.map((section) => section.id);
const OUTLINE_POPOVER_ID = "home-outline";

interface OutlineListProps {
  activeId: string | null;
  onNavigate?: () => void;
}

/** The page's sections as Markdown headings; the one being read carries `aria-current`. */
function OutlineList({ activeId, onNavigate }: OutlineListProps): ReactElement {
  const t = useTranslations("home.outline");

  return (
    <ol className={styles.list}>
      {homeSections.map((section) => (
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
            {t(`sections.${section.key}`)}
          </a>
        </li>
      ))}
    </ol>
  );
}

/**
 * Wide screens: a sticky outline beside the page, like an editor's outline of `home.md`.
 * Global control: it shows the whole map, marks where the reader is, and its line fills as the page is read.
 */
export function HomeOutlineRail(): ReactElement {
  const t = useTranslations("home.outline");
  const activeId = useActiveSection(SECTION_IDS) ?? SECTION_IDS[0];

  return (
    <nav className={styles.rail} aria-label={t("label")}>
      <div className={styles.railInner}>
        <p className={styles.fileName}>{t("file")}</p>
        <div className={styles.railBody}>
          <span className={styles.railTrack} aria-hidden="true" />
          <OutlineList activeId={activeId} />
        </div>
      </div>
    </nav>
  );
}

/**
 * Narrow screens: an editor-style status bar pinned to the bottom of the page, naming the section being
 * read and opening the full outline in a native popover (Escape or an outside click closes it).
 */
export function HomeStatusBar(): ReactElement {
  const t = useTranslations("home.outline");
  const activeId = useActiveSection(SECTION_IDS) ?? SECTION_IDS[0];
  const activeSection = homeSections.find((section) => section.id === activeId) ?? homeSections[0];
  const popoverRef = useRef<HTMLDivElement>(null);

  return (
    <div className={styles.statusBar}>
      <p className={styles.location}>
        <span className={styles.fileName}>{t("file")}</span>
        <span aria-hidden="true">›</span>
        <span className={styles.marker} aria-hidden="true">
          {"#".repeat(activeSection.level)}
        </span>
        <span className={styles.current}>
          <span className="visually-hidden">{t("reading")} </span>
          {t(`sections.${activeSection.key}`)}
        </span>
      </p>
      <button type="button" className={styles.outlineButton} popoverTarget={OUTLINE_POPOVER_ID}>
        {t("open")}
      </button>

      <div id={OUTLINE_POPOVER_ID} popover="auto" ref={popoverRef} className={styles.sheet}>
        <nav className={styles.sheetBody} aria-label={t("label")}>
          <p className={styles.fileName}>{t("file")}</p>
          <OutlineList activeId={activeId} onNavigate={() => popoverRef.current?.hidePopover()} />
        </nav>
        <button
          type="button"
          className="modal-close-floating"
          popoverTarget={OUTLINE_POPOVER_ID}
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
