"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent, type ReactElement } from "react";
import { FormAlert } from "@/components/shared/FormAlert/FormAlert";
import { SubmitButton } from "@/components/shared/SubmitButton/SubmitButton";
import { decide_review, type ReviewActionResult } from "@/server/reviews/actions";
import review_styles from "@/styles/review.module.css";
import form_styles from "@/styles/form.module.css";
import styles from "./DecisionForm.module.css";

type Decision = "approved" | "changes_requested" | "rejected";
const DECISIONS: Decision[] = ["approved", "changes_requested", "rejected"];

interface DecisionFormProps {
  review_id: string;
  slug: string;
  latest_revision_number: number;
  /** A new post's review (rejecting closes the post) rather than a change to a live one. */
  is_first_review: boolean;
}

/** The admin's answer to a review in progress: approve, request changes or reject, with a message. */
export function DecisionForm({
  review_id,
  slug,
  latest_revision_number,
  is_first_review,
}: DecisionFormProps): ReactElement {
  const t = useTranslations("review");
  const router = useRouter();
  const [decision, set_decision] = useState<Decision>("approved");
  const [message, set_message] = useState("");
  const [guidance, set_guidance] = useState("");
  const [error_message, set_error_message] = useState("");
  const [is_sending, start_sending] = useTransition();

  function hint_for(option: Decision): string {
    if (option === "approved") return t("decision.hints.approved", { number: latest_revision_number });
    if (option === "rejected")
      return t(is_first_review ? "decision.hints.rejectedFirst" : "decision.hints.rejectedUpdate");
    return t("decision.hints.changes_requested");
  }

  function show_result(result: ReviewActionResult): void {
    if (result.status === "ok") {
      set_message("");
      router.refresh();
      return;
    }
    set_error_message(t(`errors.${result.error_key}`, { requestId: result.request_id ?? "" }));
  }

  function submit_decision(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    set_error_message("");
    const message_trimmed = message.trim();
    if (decision !== "approved" && message_trimmed === "") {
      set_guidance(t("decision.messageRequired"));
      document.getElementById("decision-message")?.focus();
      return;
    }
    start_sending(async () => show_result(await decide_review(review_id, decision, message_trimmed, slug)));
  }

  return (
    <form className={styles.decision} noValidate onSubmit={submit_decision} aria-labelledby="decision-title">
      <header>
        <h2 id="decision-title" className={review_styles.cardTitle}>
          {t("decision.title")}
        </h2>
        <p className={review_styles.muted}>{t("decision.lead")}</p>
      </header>
      <fieldset className={styles.options}>
        <legend className={form_styles.label}>{t("decision.legend")}</legend>
        {DECISIONS.map((option) => (
          <label key={option} className={styles.option}>
            <input
              type="radio"
              name="decision"
              value={option}
              checked={decision === option}
              aria-describedby={`decision-hint-${option}`}
              onChange={() => {
                set_decision(option);
                set_guidance("");
              }}
            />
            <span>
              <span className={styles.optionLabel}>{t(`decision.options.${option}`)}</span>
              <span id={`decision-hint-${option}`} className={form_styles.hint}>
                {hint_for(option)}
              </span>
            </span>
          </label>
        ))}
      </fieldset>
      <div className={form_styles.field}>
        <label htmlFor="decision-message" className={form_styles.label}>
          {t("decision.messageLabel")}
        </label>
        <textarea
          id="decision-message"
          className={form_styles.input}
          rows={4}
          maxLength={5000}
          value={message}
          aria-invalid={guidance !== ""}
          aria-describedby="decision-message-hint decision-message-guidance"
          onChange={(event) => {
            set_message(event.target.value);
            set_guidance("");
          }}
        />
        <p id="decision-message-hint" className={form_styles.hint}>
          {t("decision.messageHint")}
        </p>
        <p id="decision-message-guidance" className={form_styles.guidance} aria-live="polite" hidden={guidance === ""}>
          {guidance}
        </p>
      </div>
      {error_message && <FormAlert tone="error">{error_message}</FormAlert>}
      <div>
        <SubmitButton label={t("decision.submit")} busyLabel={t("decision.busy")} isBusy={is_sending} />
      </div>
    </form>
  );
}
