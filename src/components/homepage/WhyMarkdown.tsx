import type { ReactElement } from "react";
import styles from "./WhyMarkdown.module.css";

const reasons = [
  {
    title: "Readable before you buy",
    text: "No black boxes. Plain text you can review like any other file in a pull request.",
  },
  {
    title: "Yours to adapt",
    text: "Edit the file to match your codebase. It lives in your repo, not on our servers.",
  },
  {
    title: "Tool-agnostic",
    text: "CLAUDE.md, AGENTS.md, Cursor rules or custom commands: the same file works across tools.",
  },
  {
    title: "Versioned updates",
    text: "Authors ship improvements; you diff the new version before you replace yours.",
  },
];

export function WhyMarkdown(): ReactElement {
  return (
    <section className="page-section" aria-labelledby="why-title">
      <header className="section-heading">
        <p className="eyebrow">{"// why .md"}</p>
        <h2 id="why-title">Just a file. That&rsquo;s the point.</h2>
        <p>Markdown is what AI coding tools already read, so a prompt you buy here works on day one.</p>
      </header>
      <ul className={styles.grid}>
        {reasons.map((reason) => (
          <li key={reason.title} className={styles.reason}>
            <h3>{reason.title}</h3>
            <p>{reason.text}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
