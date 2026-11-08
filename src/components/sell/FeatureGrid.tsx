import type { ReactElement } from "react";
import styles from "./FeatureGrid.module.css";

interface FeatureGridProps {
  /** Anchor id of the section; its heading gets `${id}-title`. */
  id: string;
  eyebrow: string;
  title: string;
  lead: string;
  items: { id: string; title: string; text: string }[];
}

/** A headed section with a grid of short title + text cards. */
export function FeatureGrid({ id, eyebrow, title, lead, items }: FeatureGridProps): ReactElement {
  return (
    <section id={id} className="page-section" aria-labelledby={`${id}-title`}>
      <header className="section-heading">
        <p className="eyebrow">{eyebrow}</p>
        <h2 id={`${id}-title`}>{title}</h2>
        <p>{lead}</p>
      </header>
      <ul className={styles.grid}>
        {items.map((item) => (
          <li key={item.id} className={styles.card}>
            <h3>{item.title}</h3>
            <p>{item.text}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
