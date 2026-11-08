"use client";

import { useLocale, useTranslations } from "next-intl";
import { useEffect, useRef, type MouseEvent, type ReactElement } from "react";
import { PrimaryButton } from "@/components/global/PrimaryButton";
import { downloadHref, isFree, promptHref, type PromptListing } from "@/data/prompts";
import { Link } from "@/i18n/navigation";
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
  const t = useTranslations("prompts");
  const tPrice = useTranslations("price");
  const locale = useLocale();
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
              {t(`listings.${prompt.slug}.title`)}
            </h2>
            <p className={styles.meta}>
              {prompt.author} · {t("lineCount", { count: prompt.lineCount })} ·{" "}
              {formatPrice(prompt.priceUsd, locale, tPrice("free"))} ·{" "}
              <Link href={promptHref(prompt)} className={styles.detailsLink}>
                {t("previewDialog.viewDetails")}
              </Link>
            </p>
          </header>
          <pre className={styles.excerpt}>
            <code>{prompt.excerpt}</code>
          </pre>
          {isFree(prompt) ? (
            <footer className={styles.footer}>
              <p className={styles.note}>{t("previewDialog.freeNote")}</p>
              <PrimaryButton
                href={downloadHref(prompt)}
                download
                aria-label={t("downloadFile", { fileName: prompt.fileName })}
              >
                {t("downloadFile", { fileName: prompt.fileName })}
              </PrimaryButton>
            </footer>
          ) : (
            <p className={styles.note}>{t("previewDialog.paidNote")}</p>
          )}
        </article>
      )}
      <button
        type="button"
        className="modal-close-floating"
        onClick={close}
        aria-label={t("previewDialog.close")}
        title={t("previewDialog.close")}
      >
        <span aria-hidden="true">×</span>
      </button>
    </dialog>
  );
}
