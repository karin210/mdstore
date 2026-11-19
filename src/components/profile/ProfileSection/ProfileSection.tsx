import type { ReactElement, ReactNode } from "react";
import section_styles from "@/styles/section.module.css";
import styles from "./ProfileSection.module.css";

interface ProfileSectionProps {
  /** The route index's entry for this section (see the page's `sections`). */
  id: string;
  title: string;
  /** Static intro under the heading; sections whose intro needs the session render it in `children`. */
  lead?: string;
  children: ReactNode;
}

/** One block of /profile: an h2 heading and its content in a card. */
export function ProfileSection({ id, title, lead, children }: ProfileSectionProps): ReactElement {
  const title_id = `${id}-title`;

  return (
    <section id={id} className={section_styles.pageSection} aria-labelledby={title_id}>
      <header className={section_styles.sectionHeading} data-md-level="2">
        <h2 id={title_id}>{title}</h2>
        {lead && <p>{lead}</p>}
      </header>
      <div className={styles.card}>{children}</div>
    </section>
  );
}
