"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState, useTransition, type FormEvent, type ReactElement } from "react";
import { FormAlert } from "@/components/shared/FormAlert/FormAlert";
import { SubmitButton } from "@/components/shared/SubmitButton/SubmitButton";
import type { LineSide } from "@/lib/review/types";
import { add_review_comment, type ReviewActionResult } from "@/server/reviews/actions";
import review_styles from "@/styles/review.module.css";
import form_styles from "@/styles/form.module.css";
import styles from "./CommentForm.module.css";

/** Same limit as the review_comments check in the database. */
const COMMENT_MAX_LENGTH = 5000;

interface CommentFormProps {
  review_id: string;
  /** Set for a comment on one line: of the revision's own file ("new"), or of the file it replaces ("old"). */
  line?: { revision_id: string; line_number: number; side: LineSide };
  /** Called after a line comment is sent or cancelled (closes the inline form). */
  onDone?: () => void;
}

/** A comment on the whole review, or on one line of a revision when `line` is set. */
export function CommentForm({ review_id, line, onDone }: CommentFormProps): ReactElement {
  const t = useTranslations("review");
  const router = useRouter();
  const id = useId();
  const [body, set_body] = useState("");
  const [guidance, set_guidance] = useState("");
  const [error_message, set_error_message] = useState("");
  const [is_sending, start_sending] = useTransition();
  const body_ref = useRef<HTMLTextAreaElement>(null);
  const is_line_comment = line !== undefined;

  // A line's form opens on demand, where the reviewer selected the line, so it takes the focus.
  useEffect(() => {
    if (is_line_comment) body_ref.current?.focus();
  }, [is_line_comment]);

  function show_result(result: ReviewActionResult): void {
    if (result.status === "ok") {
      set_body("");
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
    const issue =
      body_trimmed === ""
        ? t("comment.required")
        : body_trimmed.length > COMMENT_MAX_LENGTH
          ? t("comment.tooLong", { max: COMMENT_MAX_LENGTH })
          : "";
    set_guidance(issue);
    if (issue) {
      document.getElementById(`${id}-body`)?.focus();
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
        }),
      ),
    );
  }

  return (
    <form className={line ? styles.lineForm : styles.commentForm} noValidate onSubmit={send_comment}>
      <div className={form_styles.field}>
        <label htmlFor={`${id}-body`} className={form_styles.label}>
          {line
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
        <SubmitButton label={t("comment.submit")} busyLabel={t("comment.busy")} isBusy={is_sending} />
        {line && (
          <button type="button" className={review_styles.textButton} onClick={onDone}>
            {t("comment.cancel")}
          </button>
        )}
      </div>
    </form>
  );
}
