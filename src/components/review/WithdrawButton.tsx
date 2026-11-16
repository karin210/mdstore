"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState, useTransition, type ReactElement } from "react";
import { FormAlert } from "@/components/global/FormAlert";
import { withdraw_review } from "@/server/reviews/actions";
import styles from "./Review.module.css";

/**
 * The owner withdraws the review in progress. Two steps (the first press asks to confirm) instead
 * of a browser confirm dialog, which would block the page.
 */
export function WithdrawButton({
  review_id,
  is_first_review,
}: {
  review_id: string;
  is_first_review: boolean;
}): ReactElement {
  const t = useTranslations("review");
  const router = useRouter();
  const [is_confirming, set_is_confirming] = useState(false);
  const [error_message, set_error_message] = useState("");
  const [is_sending, start_sending] = useTransition();

  function press(): void {
    if (!is_confirming) {
      set_is_confirming(true);
      return;
    }
    set_error_message("");
    start_sending(async () => {
      const result = await withdraw_review(review_id);
      if (result.status === "ok") {
        set_is_confirming(false);
        router.refresh();
        return;
      }
      set_error_message(t(`errors.${result.error_key}`, { requestId: result.request_id ?? "" }));
    });
  }

  return (
    <section className={styles.card} aria-labelledby="withdraw-title">
      <h2 id="withdraw-title" className="visually-hidden">
        {t("withdraw.button")}
      </h2>
      <p className={styles.muted}>{t(is_first_review ? "withdraw.hintFirst" : "withdraw.hintUpdate")}</p>
      <div className={styles.formActions}>
        <button
          type="button"
          className={styles.dangerButton}
          data-confirming={is_confirming || undefined}
          disabled={is_sending}
          aria-busy={is_sending}
          onClick={press}
        >
          {is_sending ? t("withdraw.busy") : is_confirming ? t("withdraw.confirm") : t("withdraw.button")}
        </button>
        {is_confirming && !is_sending && (
          <button type="button" className={styles.textButton} onClick={() => set_is_confirming(false)}>
            {t("comment.cancel")}
          </button>
        )}
      </div>
      {error_message && <FormAlert tone="error">{error_message}</FormAlert>}
    </section>
  );
}
