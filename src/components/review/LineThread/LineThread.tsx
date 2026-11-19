"use client";

import type { ReactElement } from "react";
import { CommentForm } from "@/components/review/CommentForm/CommentForm";
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
}

interface LineThreadProps {
  review_id: string;
  revision_id: string;
  line_number: number;
  side: LineSide;
  comments: LineComment[];
  is_form_open: boolean;
  on_close: () => void;
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
}: LineThreadProps): ReactElement {
  return (
    <div className={styles.thread}>
      {comments.map((comment) => (
        <article key={comment.id} className={styles.comment}>
          <p className={review_styles.eventHeader}>
            <strong>@{comment.username}</strong>
            <span>{comment.date}</span>
          </p>
          <p className={review_styles.body}>{comment.body}</p>
        </article>
      ))}
      {is_form_open && (
        <CommentForm review_id={review_id} line={{ revision_id, line_number, side }} onDone={on_close} />
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
