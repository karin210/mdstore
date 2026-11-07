import type { Metadata } from "next";
import type { ReactElement } from "react";
import { PrimaryButton } from "@/components/global/PrimaryButton";
import styles from "./not-found.module.css";

export const metadata: Metadata = {
  title: "Page not found",
};

/** Branded 404 for every unmatched URL (served with a real 404 status). */
export default function NotFound(): ReactElement {
  return (
    <main className={styles.main}>
      <section className={styles.card} aria-labelledby="not-found-title">
        <code className={styles.code}>404.md</code>
        <h1 id="not-found-title" className={styles.title}>
          This page doesn&rsquo;t exist
        </h1>
        <p className={styles.text}>
          The link may be broken or the page may have moved. The prompts are still where you left them.
        </p>
        <PrimaryButton href="/">Back to the home page</PrimaryButton>
      </section>
    </main>
  );
}
