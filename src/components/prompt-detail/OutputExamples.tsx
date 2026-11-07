import Image from "next/image";
import type { ReactElement } from "react";
import type { OutputExample } from "@/data/prompts";
import styles from "./OutputExamples.module.css";

interface OutputExamplesProps {
  examples: OutputExample[];
  fileName: string;
}

/** Slots shown while a listing has no screenshots yet, so the section keeps its final layout. */
const PLACEHOLDER_COUNT = 3;

/** Screenshots of what the prompt produces; empty slots until the seller uploads them. */
export function OutputExamples({ examples, fileName }: OutputExamplesProps): ReactElement {
  const hasExamples = examples.length > 0;

  return (
    <section className={styles.section} aria-labelledby="examples-title">
      <header className={styles.header}>
        <h2 id="examples-title" className={styles.title}>
          Output examples
        </h2>
        <p className={styles.note}>
          {hasExamples
            ? `What an agent built while following ${fileName}.`
            : `Screenshots of what an agent builds with ${fileName} are on their way.`}
        </p>
      </header>

      <ul className={styles.grid}>
        {hasExamples
          ? examples.map((example) => (
              <li key={example.src}>
                <figure className={styles.figure}>
                  <div className={styles.frame}>
                    <Image
                      src={example.src}
                      alt={example.alt}
                      fill
                      sizes="(min-width: 60rem) 24rem, 90vw"
                      className={styles.image}
                    />
                  </div>
                  <figcaption className={styles.caption}>{example.caption}</figcaption>
                </figure>
              </li>
            ))
          : Array.from({ length: PLACEHOLDER_COUNT }, (_, index) => (
              <li key={index}>
                <figure className={styles.figure}>
                  <div className={styles.frame} data-placeholder="true">
                    <span className={styles.placeholderLabel} aria-hidden="true">
                      {`example-${index + 1}.png`}
                    </span>
                  </div>
                  <figcaption className={styles.caption}>
                    Example {index + 1}
                    <span className="visually-hidden">: screenshot coming soon</span>
                  </figcaption>
                </figure>
              </li>
            ))}
      </ul>
    </section>
  );
}
