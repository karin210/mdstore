"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useId, useState, useTransition, type ReactElement } from "react";
import { FormAlert } from "@/components/shared/FormAlert/FormAlert";
import { SubmitButton } from "@/components/shared/SubmitButton/SubmitButton";
import { lines_from_text, type SuggestionView } from "@/lib/review/suggestions";
import { apply_suggestions, reject_suggestion, type ReviewActionResult } from "@/server/reviews/actions";
import form_styles from "@/styles/form.module.css";
import review_styles from "@/styles/review.module.css";
import utility_styles from "@/styles/utilities.module.css";
import styles from "./SuggestionCard.module.css";

interface SuggestionCardProps {
  review_id: string;
  comment_id: string;
  view: SuggestionView;
  /** @username of whoever accepted or rejected it. */
  resolved_by: string | null;
  /** The post's authors, while the review is in progress and they have a username. */
  can_answer: boolean;
}

type Mode = "idle" | "editing" | "rejecting";

/** The lines a suggestion replaces (red) and what it puts there (green), like a small diff. */
export function SuggestionDiff({
  original,
  proposed,
  label,
}: {
  original: string[];
  proposed: string[];
  label: string;
}): ReactElement {
  const t = useTranslations("review");
  return (
    <div className={review_styles.codeScroller} tabIndex={0} aria-label={label}>
      <table className={`${review_styles.codeTable} ${styles.diff}`}>
        <tbody>
          {original.map((line, index) => (
            <tr key={`old-${index}`} data-kind="removed">
              <td className={review_styles.diffCode}>
                <span className={utility_styles.visuallyHidden}>{t("changes.removed")}: </span>
                <span aria-hidden="true" className={styles.marker}>
                  −
                </span>
                {line || " "}
              </td>
            </tr>
          ))}
          {proposed.map((line, index) => (
            <tr key={`new-${index}`} data-kind="added">
              <td className={review_styles.diffCode}>
                <span className={utility_styles.visuallyHidden}>{t("changes.added")}: </span>
                <span aria-hidden="true" className={styles.marker}>
                  +
                </span>
                {line || " "}
              </td>
            </tr>
          ))}
          {proposed.length === 0 && (
            <tr data-kind="note">
              <td className={review_styles.diffCode}>{t("suggestion.deletes")}</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

/**
 * A suggested change: its diff, its status and, for the post's authors, the answers: accept it as written,
 * edit it and accept that, or reject it with an optional reply. Accepting pushes a new revision.
 */
export function SuggestionCard({
  review_id,
  comment_id,
  view,
  resolved_by,
  can_answer,
}: SuggestionCardProps): ReactElement {
  const t = useTranslations("review");
  const router = useRouter();
  const id = useId();
  const [mode, set_mode] = useState<Mode>("idle");
  const [edited_text, set_edited_text] = useState(view.proposed.join("\n"));
  const [reply, set_reply] = useState("");
  const [error_message, set_error_message] = useState("");
  const [is_sending, start_sending] = useTransition();
  const answer_label = t(view.status === "outdated" ? "suggestion.outdatedReject" : "suggestion.reject");

  function show_result(result: ReviewActionResult): void {
    if (result.status === "ok") {
      set_mode("idle");
      router.refresh();
      return;
    }
    set_error_message(t(`errors.${result.error_key}`, { requestId: result.request_id ?? "" }));
  }

  function accept(lines?: string[]): void {
    set_error_message("");
    start_sending(async () => show_result(await apply_suggestions(review_id, [{ id: comment_id, lines }], "")));
  }

  function reject(): void {
    set_error_message("");
    start_sending(async () => show_result(await reject_suggestion(comment_id, reply)));
  }

  const is_answerable = can_answer && (view.status === "pending" || view.status === "outdated");

  return (
    <div className={styles.card} data-status={view.status}>
      <p className={styles.statusLine}>
        <span className={styles.status} data-status={view.status}>
          {t(`suggestion.state.${view.status}`)}
        </span>
        {view.status === "accepted" && view.applied_revision_number !== null && (
          <span>
            {t(view.applied ? "suggestion.acceptedEdited" : "suggestion.acceptedInto", {
              username: resolved_by ?? t("timeline.someone"),
              number: view.applied_revision_number,
            })}
          </span>
        )}
        {view.status === "rejected" && (
          <span>{t("suggestion.rejectedBy", { username: resolved_by ?? t("timeline.someone") })}</span>
        )}
      </p>

      <SuggestionDiff original={view.original} proposed={view.proposed} label={t("suggestion.diffLabel")} />

      {view.applied && (
        <>
          <p className={review_styles.muted}>{t("suggestion.appliedAs")}</p>
          <SuggestionDiff original={view.original} proposed={view.applied} label={t("suggestion.appliedAs")} />
        </>
      )}

      {view.status === "outdated" && <p className={review_styles.muted}>{t("suggestion.outdated")}</p>}

      {is_answerable && mode === "idle" && (
        <div className={review_styles.formActions}>
          {view.status === "pending" && (
            <>
              <button
                type="button"
                className={styles.acceptButton}
                disabled={is_sending}
                aria-busy={is_sending}
                onClick={() => accept()}
              >
                {is_sending ? t("suggestion.accepting") : t("suggestion.accept")}
              </button>
              <button type="button" className={review_styles.secondaryButton} onClick={() => set_mode("editing")}>
                {t("suggestion.edit")}
              </button>
            </>
          )}
          <button type="button" className={review_styles.textButton} onClick={() => set_mode("rejecting")}>
            {answer_label}
          </button>
        </div>
      )}

      {is_answerable && mode === "editing" && (
        <form
          className={styles.answerForm}
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            accept(lines_from_text(edited_text));
          }}
        >
          <div className={form_styles.field}>
            <label htmlFor={`${id}-edit`} className={form_styles.label}>
              {t("suggestion.editLabel")}
            </label>
            <textarea
              id={`${id}-edit`}
              className={`${form_styles.input} ${styles.codeInput}`}
              rows={Math.min(Math.max(view.proposed.length, 2), 12)}
              value={edited_text}
              spellCheck={false}
              aria-describedby={`${id}-edit-hint`}
              onChange={(event) => set_edited_text(event.target.value)}
              autoFocus
            />
            <p id={`${id}-edit-hint`} className={form_styles.hint}>
              {t("suggestion.textHint")}
            </p>
          </div>
          <div className={review_styles.formActions}>
            <SubmitButton
              label={t("suggestion.applyEdited")}
              busyLabel={t("suggestion.accepting")}
              isBusy={is_sending}
            />
            <button type="button" className={review_styles.textButton} onClick={() => set_mode("idle")}>
              {t("suggestion.cancel")}
            </button>
          </div>
        </form>
      )}

      {is_answerable && mode === "rejecting" && (
        <form
          className={styles.answerForm}
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            reject();
          }}
        >
          <div className={form_styles.field}>
            <label htmlFor={`${id}-reply`} className={form_styles.label}>
              {t("suggestion.replyLabel")}
            </label>
            <textarea
              id={`${id}-reply`}
              className={form_styles.input}
              rows={2}
              value={reply}
              maxLength={5000}
              onChange={(event) => set_reply(event.target.value)}
              autoFocus
            />
          </div>
          <div className={review_styles.formActions}>
            <SubmitButton
              label={t("suggestion.confirmReject")}
              busyLabel={t("suggestion.rejecting")}
              isBusy={is_sending}
            />
            <button type="button" className={review_styles.textButton} onClick={() => set_mode("idle")}>
              {t("suggestion.cancel")}
            </button>
          </div>
        </form>
      )}

      {error_message && <FormAlert tone="error">{error_message}</FormAlert>}
    </div>
  );
}
