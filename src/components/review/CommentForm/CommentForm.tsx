"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState, useTransition, type FormEvent, type ReactElement } from "react";
import { FormAlert } from "@/components/shared/FormAlert/FormAlert";
import { SubmitButton } from "@/components/shared/SubmitButton/SubmitButton";
import { lines_from_text } from "@/lib/review/suggestions";
import type { LineSide } from "@/lib/review/types";
import { add_review_comment, type ReviewActionResult } from "@/server/reviews/actions";
import review_styles from "@/styles/review.module.css";
import form_styles from "@/styles/form.module.css";
import styles from "./CommentForm.module.css";

/** Same limit as the review_comments check in the database. */
const COMMENT_MAX_LENGTH = 5000;
/** How many lines one suggestion can span, so the range picker stays short. */
const SUGGESTION_MAX_LINES = 50;

interface CommentFormProps {
  review_id: string;
  /**
   * Set for a comment on one line: of the revision's own file ("new"), or of the file it replaces ("old").
   * `file_lines` (the revision's own file) also offers suggesting a change, starting at that line.
   */
  line?: { revision_id: string; line_number: number; side: LineSide; file_lines?: string[] };
  /** Called after a line comment is sent or cancelled (closes the inline form). */
  onDone?: () => void;
}

/**
 * A comment on the whole review, or on one line of a revision when `line` is set. On a line of the
 * revision's own file it can carry a suggested change: replacement text for that line or a range from it.
 */
export function CommentForm({ review_id, line, onDone }: CommentFormProps): ReactElement {
  const t = useTranslations("review");
  const router = useRouter();
  const id = useId();
  const [body, set_body] = useState("");
  const [guidance, set_guidance] = useState("");
  const [error_message, set_error_message] = useState("");
  const [is_sending, start_sending] = useTransition();
  const body_ref = useRef<HTMLTextAreaElement>(null);
  const suggestion_ref = useRef<HTMLTextAreaElement>(null);
  const is_line_comment = line !== undefined;

  const file_lines = line?.file_lines;
  const can_suggest = file_lines !== undefined && line?.side === "new";
  const [is_suggesting, set_is_suggesting] = useState(false);
  const [line_end, set_line_end] = useState(line?.line_number ?? 1);
  const [suggestion_text, set_suggestion_text] = useState("");
  const [suggestion_guidance, set_suggestion_guidance] = useState("");
  const first_line = line?.line_number ?? 1;
  const last_possible_line = Math.min(file_lines?.length ?? first_line, first_line + SUGGESTION_MAX_LINES - 1);
  const original_text = (end: number): string => (file_lines ?? []).slice(first_line - 1, end).join("\n");

  // A line's form opens on demand, where the reviewer selected the line, so it takes the focus.
  useEffect(() => {
    if (is_line_comment) body_ref.current?.focus();
  }, [is_line_comment]);

  function toggle_suggesting(next: boolean): void {
    set_is_suggesting(next);
    set_suggestion_guidance("");
    if (next) {
      // Starts from the lines as they are, ready to edit.
      set_suggestion_text(original_text(line_end));
      requestAnimationFrame(() => suggestion_ref.current?.focus());
    }
  }

  function change_line_end(next: number): void {
    // The text follows the range until the reviewer edits it.
    if (suggestion_text === original_text(line_end)) set_suggestion_text(original_text(next));
    set_line_end(next);
    set_suggestion_guidance("");
  }

  function show_result(result: ReviewActionResult): void {
    if (result.status === "ok") {
      set_body("");
      set_is_suggesting(false);
      onDone?.();
      // The review is rendered per request on the server; a refresh shows the new comment.
      router.refresh();
      return;
    }
    set_error_message(t(`errors.${result.error_key}`, { requestId: result.request_id ?? "" }));
  }

  function send_comment(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    set_error_message("");
    const body_trimmed = body.trim();
    const suggesting = can_suggest && is_suggesting;
    const issue =
      body_trimmed === "" && !suggesting
        ? t("comment.required")
        : body_trimmed.length > COMMENT_MAX_LENGTH
          ? t("comment.tooLong", { max: COMMENT_MAX_LENGTH })
          : "";
    const suggestion_issue =
      suggesting && suggestion_text.replace(/\r\n/g, "\n") === original_text(line_end) ? t("suggestion.unchanged") : "";
    set_guidance(issue);
    set_suggestion_guidance(suggestion_issue);
    if (suggestion_issue) {
      suggestion_ref.current?.focus();
      return;
    }
    if (issue) {
      body_ref.current?.focus();
      return;
    }
    start_sending(async () =>
      show_result(
        await add_review_comment({
          review_id,
          body: body_trimmed,
          revision_id: line?.revision_id,
          line_number: line?.line_number,
          line_side: line?.side,
          suggestion: suggesting ? lines_from_text(suggestion_text) : undefined,
          line_end: suggesting && line_end > first_line ? line_end : undefined,
        }),
      ),
    );
  }

  return (
    <form className={line ? styles.lineForm : styles.commentForm} noValidate onSubmit={send_comment}>
      {can_suggest && (
        <label className={styles.toggle}>
          <input
            type="checkbox"
            checked={is_suggesting}
            onChange={(event) => toggle_suggesting(event.target.checked)}
          />
          {t("suggestion.toggle")}
        </label>
      )}

      {can_suggest && is_suggesting && (
        <>
          {last_possible_line > first_line && (
            <div className={form_styles.field}>
              <label htmlFor={`${id}-end`} className={form_styles.label}>
                {t("suggestion.lineEndLabel")}
              </label>
              <select
                id={`${id}-end`}
                className={`${form_styles.input} ${styles.lineEnd}`}
                value={line_end}
                onChange={(event) => change_line_end(Number(event.target.value))}
              >
                {Array.from({ length: last_possible_line - first_line + 1 }, (_, index) => first_line + index).map(
                  (number) => (
                    <option key={number} value={number}>
                      {number}
                    </option>
                  ),
                )}
              </select>
            </div>
          )}
          <div className={form_styles.field}>
            <label htmlFor={`${id}-suggestion`} className={form_styles.label}>
              {t("suggestion.textLabel", {
                count: line_end - first_line + 1,
                first: first_line,
                last: line_end,
              })}
            </label>
            <textarea
              id={`${id}-suggestion`}
              ref={suggestion_ref}
              className={`${form_styles.input} ${styles.codeInput}`}
              rows={Math.min(Math.max(line_end - first_line + 1, 2), 12)}
              value={suggestion_text}
              spellCheck={false}
              aria-invalid={suggestion_guidance !== ""}
              aria-describedby={`${id}-suggestion-hint ${id}-suggestion-guidance`}
              onChange={(event) => {
                set_suggestion_text(event.target.value);
                set_suggestion_guidance("");
              }}
            />
            <p id={`${id}-suggestion-hint`} className={form_styles.hint}>
              {t("suggestion.textHint")}
            </p>
            <p
              id={`${id}-suggestion-guidance`}
              className={form_styles.guidance}
              aria-live="polite"
              hidden={suggestion_guidance === ""}
            >
              {suggestion_guidance}
            </p>
          </div>
        </>
      )}

      <div className={form_styles.field}>
        <label htmlFor={`${id}-body`} className={form_styles.label}>
          {can_suggest && is_suggesting
            ? t("suggestion.bodyLabel")
            : line
              ? t(line.side === "old" ? "comment.lineLabelOld" : "comment.lineLabel", { line: line.line_number })
              : t("comment.label")}
        </label>
        <textarea
          id={`${id}-body`}
          className={form_styles.input}
          rows={line ? 3 : 4}
          value={body}
          ref={body_ref}
          aria-invalid={guidance !== ""}
          aria-describedby={`${id}-hint ${id}-guidance`}
          onChange={(event) => {
            set_body(event.target.value);
            set_guidance("");
          }}
        />
        <p id={`${id}-hint`} className={form_styles.hint}>
          {t("comment.hint")}
        </p>
        <p id={`${id}-guidance`} className={form_styles.guidance} aria-live="polite" hidden={guidance === ""}>
          {guidance}
        </p>
      </div>
      {error_message && <FormAlert tone="error">{error_message}</FormAlert>}
      <div className={review_styles.formActions}>
        <SubmitButton
          label={can_suggest && is_suggesting ? t("suggestion.submit") : t("comment.submit")}
          busyLabel={t("comment.busy")}
          isBusy={is_sending}
        />
        {line && (
          <button type="button" className={review_styles.textButton} onClick={onDone}>
            {t("comment.cancel")}
          </button>
        )}
      </div>
    </form>
  );
}
