"use client";

import { useTranslations } from "next-intl";
import { useState, useTransition, type ReactElement } from "react";
import { FormAlert } from "@/components/global/FormAlert/FormAlert";
import { useRouter } from "@/i18n/navigation";
import { accept_post_invite } from "@/server/reviews/actions";
import styles from "@/components/review/shared/Review.module.css";

/** Joins the post as co-author, then opens its review. */
export function InviteAccept({ token }: { token: string }): ReactElement {
  const t = useTranslations("review");
  const router = useRouter();
  const [error_message, set_error_message] = useState("");
  const [is_joining, start_joining] = useTransition();

  function accept(): void {
    set_error_message("");
    start_joining(async () => {
      const result = await accept_post_invite(token);
      if (result.status === "ok") {
        router.push(`/prompts/${result.slug}/review`);
        return;
      }
      set_error_message(t(`errors.${result.error_key}`, { requestId: result.request_id ?? "" }));
    });
  }

  return (
    <div className={styles.formActions}>
      <button
        type="button"
        className={styles.secondaryButton}
        disabled={is_joining}
        aria-busy={is_joining}
        onClick={accept}
      >
        {is_joining ? t("invite.accepting") : t("invite.accept")}
      </button>
      {error_message && <FormAlert tone="error">{error_message}</FormAlert>}
    </div>
  );
}
