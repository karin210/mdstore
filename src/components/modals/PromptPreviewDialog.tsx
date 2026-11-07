"use client";

import { useEffect, useRef, type MouseEvent, type ReactElement } from "react";
import { PrimaryButton } from "@/components/global/PrimaryButton";
import { downloadHref, isFree, type PromptListing } from "@/data/prompts";
import { formatPrice } from "@/lib/formatPrice";
import styles from "./PromptPreviewDialog.module.css";

interface PromptPreviewDialogProps {
  prompt: PromptListing | null;
  onClose: () => void;
}

/**
 * Dismissible modal: closes with Escape (native), a click on the backdrop,
 * or the floating X button.
 */
export function PromptPreviewDialog({ prompt, onClose }: PromptPreviewDialogProps): ReactElement {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (prompt && dialog && !dialog.open) dialog.showModal();
  }, [prompt]);

  function close(): void {
    dialogRef.current?.close();
  }

  function closeOnBackdrop(event: MouseEvent<HTMLDialogElement>): void {
    // The dialog has no padding, so a click that targets it directly landed on the backdrop.
    if (event.target === event.currentTarget) close();
  }

  return (
    <dialog
      ref={dialogRef}
      className={styles.dialog}
      aria-labelledby="prompt-preview-title"
      onClose={onClose}
      onClick={closeOnBackdrop}
    >
      {prompt && (
        <article className={styles.content}>
          <header className={styles.header}>
            <code className={styles.fileName}>{prompt.fileName}</code>
            <h2 id="prompt-preview-title" className="modal-title">
              {prompt.title}
            </h2>
            <p className={styles.meta}>
              {prompt.author} · {prompt.lineCount} lines · {formatPrice(prompt.priceUsd)}
            </p>
          </header>
          <pre className={styles.excerpt}>
            <code>{prompt.excerpt}</code>
          </pre>
          {isFree(prompt) ? (
            <footer className={styles.footer}>
              <p className={styles.note}>
                The first lines of the file. This one is free: download the full .md and drop it into your repo.
              </p>
              <PrimaryButton href={downloadHref(prompt)} download aria-label={`Download ${prompt.fileName}`}>
                Download {prompt.fileName}
              </PrimaryButton>
            </footer>
          ) : (
            <p className={styles.note}>
              Free preview: the first lines of the file. The full version is delivered as a .md download after
              purchase.
            </p>
          )}
        </article>
      )}
      <button
        type="button"
        className="modal-close-floating"
        onClick={close}
        aria-label="Close preview"
        title="Close preview"
      >
        <span aria-hidden="true">×</span>
      </button>
    </dialog>
  );
}
