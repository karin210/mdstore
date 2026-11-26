"use client";

import type { ReactElement } from "react";
import { useTranslations } from "next-intl";
import { CommentForm } from "@/components/review/CommentForm/CommentForm";
import { SuggestionCard } from "@/components/review/SuggestionCard/SuggestionCard";
import type { SuggestionView } from "@/lib/review/suggestions";
import type { LineSide } from "@/lib/review/types";
import review_styles from "@/styles/review.module.css";
import styles from "./LineThread.module.css";

/** A comment on one line, ready to show (the username resolved and the date formatted). */
export interface LineComment {
  id: string;
  line_number: number;
  side: LineSide;
  username: string;
  body: string;
  date: string;
  /** Set on a suggested change. */
  suggestion?: SuggestionView;
  /** @username of whoever answered the suggestion. */
  resolved_by?: string | null;
}

interface LineThreadProps {
  review_id: string;
  revision_id: string;
  line_number: number;
  side: LineSide;
  comments: LineComment[];
  is_form_open: boolean;
  on_close: () => void;
  /** The file the line belongs to, for suggesting a change (the "new" side only). */
  file_lines?: string[];
  /** The post's authors, while the review is in progress: they answer suggestions. */
  can_answer: boolean;
}

/**
 * The comments on one line, oldest first, and the form to add one when it is open. Shown under the
 * line in both the File tab and the Changes tab, so a comment made in one shows in the other.
 */
export function LineThread({
  review_id,
  revision_id,
  line_number,
  side,
  comments,
  is_form_open,
  on_close,
  file_lines,
  can_answer,
}: LineThreadProps): ReactElement {
  const t = useTranslations("review");
  return (
    <div className={styles.thread}>
      {comments.map((comment) => (
        <article key={comment.id} className={styles.comment}>
          <p className={review_styles.eventHeader}>
            <strong>
              {comment.suggestion
                ? t("suggestion.lineHeading", {
                    username: comment.username,
                    count: comment.suggestion.last_line - comment.suggestion.first_line + 1,
                    first: comment.suggestion.first_line,
                    last: comment.suggestion.last_line,
                  })
                : `@${comment.username}`}
            </strong>
            <span>{comment.date}</span>
          </p>
          {comment.body && <p className={review_styles.body}>{comment.body}</p>}
          {comment.suggestion && (
            <SuggestionCard
              review_id={review_id}
              comment_id={comment.id}
              view={comment.suggestion}
              resolved_by={comment.resolved_by ?? null}
              can_answer={can_answer}
            />
          )}
        </article>
      ))}
      {is_form_open && (
        <CommentForm
          review_id={review_id}
          line={{ revision_id, line_number, side, file_lines: side === "new" ? file_lines : undefined }}
          onDone={on_close}
        />
      )}
    </div>
  );
}

/** Comments grouped by the line they are on, under a key that also names the side. */
export function group_line_comments(comments: LineComment[]): Map<string, LineComment[]> {
  const groups = new Map<string, LineComment[]>();
  comments.forEach((comment) => {
    const key = line_key(comment.side, comment.line_number);
    groups.set(key, [...(groups.get(key) ?? []), comment]);
  });
  return groups;
}

export function line_key(side: LineSide, line_number: number): string {
  return `${side}:${line_number}`;
}
