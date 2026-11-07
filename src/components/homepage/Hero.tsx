import type { ReactElement } from "react";
import { PrimaryButton } from "@/components/global/PrimaryButton";
import { SecondaryButton } from "@/components/global/SecondaryButton";
import styles from "./Hero.module.css";

const highlights = [
  "Plain Markdown, no lock-in",
  "Free preview before you buy",
  "Works with any AI coding tool",
];

export function Hero(): ReactElement {
  return (
    <section className={styles.hero} aria-labelledby="hero-title">
      <div className={styles.copy}>
        <p className="eyebrow">{"// the marketplace for coding prompts"}</p>
        <h1 id="hero-title" className={styles.title}>
          Prompts that ship code, sold as <span className={styles.highlight}>.md</span> files.
        </h1>
        <p className={styles.lead}>
          Buy battle-tested instructions for Claude Code, Cursor and Copilot from the developers who wrote them. Drop
          the file into your repo and your agent works the way theirs does.
        </p>
        <div className={styles.actions}>
          <PrimaryButton href="#featured" size="large">
            Browse prompts
          </PrimaryButton>
          <SecondaryButton href="#sell" size="large">
            Start selling
          </SecondaryButton>
        </div>
        <ul className={styles.highlights}>
          {highlights.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>

      <figure className={styles.file}>
        <figcaption className={styles.fileBar}>
          <span className={styles.dots} aria-hidden="true" />
          <span>CLAUDE.md</span>
        </figcaption>
        <pre className={styles.code}>
          <code>
            <span data-token="heading"># Senior Next.js pair programmer</span>
            {"\n\n"}
            <span data-token="heading">## Before writing code</span>
            {"\n"}- Read the installed framework docs first.
            {"\n"}- Ask when a requirement is ambiguous.
            {"\n\n"}
            <span data-token="heading">## Conventions</span>
            {"\n"}- Explicit return types, <span data-token="inline">no any</span>.
            {"\n"}- Semantic HTML, WCAG 2.1 AA.
            {"\n"}- Colours only through <span data-token="inline">:root</span> tokens.
            {"\n\n"}
            <span data-token="comment">{"<!-- 128 more lines -->"}</span>
          </code>
        </pre>
      </figure>
    </section>
  );
}
