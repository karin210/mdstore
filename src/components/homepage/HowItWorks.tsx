import type { ReactElement } from "react";
import styles from "./HowItWorks.module.css";

interface Track {
  id: string;
  audience: string;
  steps: { title: string; text: string }[];
}

const tracks: Track[] = [
  {
    id: "buyers",
    audience: "For buyers",
    steps: [
      { title: "Find", text: "Filter by stack, task and the AI tool you use." },
      { title: "Preview", text: "Read the opening of every file for free before paying." },
      { title: "Drop it in", text: "Download the .md and commit it. Your agent picks it up on the next run." },
    ],
  },
  {
    id: "sellers",
    audience: "For sellers",
    steps: [
      { title: "Write", text: "Package the instructions that already make your agent great." },
      { title: "Publish", text: "Set a price, choose the preview length and list the tools you tested." },
      { title: "Earn", text: "Get paid on every sale and ship updates buyers receive automatically." },
    ],
  },
];

export function HowItWorks(): ReactElement {
  return (
    <section id="how-it-works" className="page-section" aria-labelledby="how-title">
      <header className="section-heading">
        <p className="eyebrow">{"// how it works"}</p>
        <h2 id="how-title">From someone&rsquo;s repo to yours in three steps</h2>
      </header>
      <div className={styles.tracks}>
        {tracks.map((track) => (
          <article key={track.id} className={styles.track} aria-labelledby={`track-${track.id}`}>
            <h3 id={`track-${track.id}`} className={styles.audience}>
              {track.audience}
            </h3>
            <ol className={styles.steps}>
              {track.steps.map((step) => (
                <li key={step.title} className={styles.step}>
                  <strong>{step.title}</strong>
                  <span>{step.text}</span>
                </li>
              ))}
            </ol>
          </article>
        ))}
      </div>
    </section>
  );
}
