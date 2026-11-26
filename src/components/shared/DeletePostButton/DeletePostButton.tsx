"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState, useTransition, type ReactElement } from "react";
import { FormAlert } from "@/components/shared/FormAlert/FormAlert";
import { delete_post } from "@/server/prompts/deletePost";
import styles from "./DeletePostButton.module.css";

interface DeletePostButtonProps {
  post_id: string;
  title: string;
}

/**
 * The owner deletes a post from their uploads list. Two steps, without a browser dialog (it would block the
 * page): the trash button opens an inline confirmation that says what goes with the post, and only its
 * "Delete permanently" button deletes. Escape or Cancel closes it.
 */
export function DeletePostButton({ post_id, title }: DeletePostButtonProps): ReactElement {
  const t = useTranslations("account.submissions.delete");
  const router = useRouter();
  const id = useId();
  const [is_confirming, set_is_confirming] = useState(false);
  const [error_message, set_error_message] = useState("");
  const [is_deleting, start_deleting] = useTransition();
  const cancel_ref = useRef<HTMLButtonElement>(null);
  const open_ref = useRef<HTMLButtonElement>(null);
  const was_confirming = useRef(false);

  // Focus moves into the confirmation on the safe choice, and back to the trash button when it closes.
  useEffect(() => {
    if (is_confirming) cancel_ref.current?.focus();
    else if (was_confirming.current) open_ref.current?.focus();
    was_confirming.current = is_confirming;
  }, [is_confirming]);

  function cancel(): void {
    set_is_confirming(false);
    set_error_message("");
  }

  function confirm_delete(): void {
    set_error_message("");
    start_deleting(async () => {
      const result = await delete_post(post_id);
      if (result.status === "ok") {
        // The list is rendered per request on the server; a refresh drops the deleted post.
        router.refresh();
        return;
      }
      set_error_message(t(`errors.${result.error_key}`, { requestId: result.request_id ?? "" }));
    });
  }

  if (!is_confirming) {
    return (
      <button
        type="button"
        ref={open_ref}
        className={styles.deleteButton}
        aria-label={t("button", { title })}
        onClick={() => set_is_confirming(true)}
      >
        <span className={styles.icon} aria-hidden="true" />
        <span aria-hidden="true">{t("label")}</span>
      </button>
    );
  }

  return (
    <div
      className={styles.confirm}
      role="group"
      aria-labelledby={`${id}-question`}
      onKeyDown={(event) => {
        if (event.key === "Escape" && !is_deleting) cancel();
      }}
    >
      <p id={`${id}-question`} className={styles.question}>
        {t("question", { title })}
      </p>
      <p className={styles.consequence}>{t("consequence")}</p>
      {error_message && <FormAlert tone="error">{error_message}</FormAlert>}
      <div className={styles.actions}>
        <button
          type="button"
          className={styles.confirmButton}
          disabled={is_deleting}
          aria-busy={is_deleting}
          onClick={confirm_delete}
        >
          <span className={styles.icon} aria-hidden="true" />
          {is_deleting ? t("busy") : t("confirm")}
        </button>
        <button type="button" ref={cancel_ref} className={styles.cancelButton} disabled={is_deleting} onClick={cancel}>
          {t("cancel")}
        </button>
      </div>
    </div>
  );
}
