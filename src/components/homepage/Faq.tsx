import type { ReactElement } from "react";
import { faqEntries } from "@/data/faq";
import styles from "./Faq.module.css";

export function Faq(): ReactElement {
  return (
    <section id="faq" className="page-section" aria-labelledby="faq-title">
      <header className="section-heading">
        <p className="eyebrow">{"// faq"}</p>
        <h2 id="faq-title">Questions, answered</h2>
      </header>
      <div className={styles.list}>
        {faqEntries.map((entry) => (
          <details key={entry.question} className={styles.item} name="faq">
            <summary className={styles.question}>{entry.question}</summary>
            <p className={styles.answer}>{entry.answer}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
