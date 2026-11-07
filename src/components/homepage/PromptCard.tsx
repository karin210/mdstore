import type { ReactElement } from "react";
import { PrimaryButton } from "@/components/global/PrimaryButton";
import { downloadHref, isFree, type PromptListing } from "@/data/prompts";
import { formatPrice } from "@/lib/formatPrice";
import styles from "./PromptCard.module.css";

interface PromptCardProps {
  prompt: PromptListing;
  onPreview: (prompt: PromptListing) => void;
}

export function PromptCard({ prompt, onPreview }: PromptCardProps): ReactElement {
  const titleId = `prompt-${prompt.slug}-title`;

  return (
    <article className={styles.card} aria-labelledby={titleId}>
      <header className={styles.top}>
        <code className={styles.fileName}>{prompt.fileName}</code>
        <span className={styles.category}>{prompt.category}</span>
      </header>
      <h3 id={titleId} className={styles.title}>
        {prompt.title}
      </h3>
      <p className={styles.summary}>{prompt.summary}</p>
      <ul className={styles.tools} aria-label="Tested with">
        {prompt.worksWith.map((tool) => (
          <li key={tool}>{tool}</li>
        ))}
      </ul>
      <footer className={styles.bottom}>
        <dl className={styles.meta}>
          <div>
            <dt className="visually-hidden">Price</dt>
            <dd className={styles.price}>{formatPrice(prompt.priceUsd)}</dd>
          </div>
          <div>
            <dt className="visually-hidden">Author and length</dt>
            <dd className={styles.byline}>
              {prompt.author} · {prompt.lineCount} lines
            </dd>
          </div>
        </dl>
        <div className={styles.actions}>
          {/* Tertiary kind: informational trigger with no purchase intent */}
          <button
            type="button"
            className={styles.preview}
            onClick={() => onPreview(prompt)}
            aria-label={`Preview ${prompt.fileName}`}
          >
            Preview
          </button>
          {isFree(prompt) && (
            <PrimaryButton
              href={downloadHref(prompt)}
              download
              size="small"
              aria-label={`Download ${prompt.fileName}`}
            >
              Download
            </PrimaryButton>
          )}
        </div>
      </footer>
    </article>
  );
}
