"use client";

import { useTranslations } from "next-intl";
import { Fragment, useState, type ReactElement } from "react";
import { group_line_comments, line_key, LineThread, type LineComment } from "@/components/review/LineThread/LineThread";
import type { DiffHunk, DiffLine } from "@/lib/review/diffLines";
import type { LineSide } from "@/lib/review/types";
import review_styles from "@/styles/review.module.css";
import utility_styles from "@/styles/utilities.module.css";
import styles from "./DiffTable.module.css";

interface DiffTableProps {
  review_id: string;
  revision_id: string;
  hunks: DiffHunk[];
  hidden_after: number;
  /** The revision's line comments, on both sides. */
  comments: LineComment[];
  /** Authors and admins of a review in progress who have a username. */
  can_comment: boolean;
  label: string;
}

/** Where a diff line takes comments: removed lines on the old file, the rest on the revision's own. */
function anchor_of(line: DiffLine): { side: LineSide; line_number: number } {
  return line.kind === "removed"
    ? { side: "old", line_number: line.old_number }
    : { side: "new", line_number: line.new_number };
}

/**
 * The file's changes as a unified diff, like a pull request's: reviewers comment on any shown line
 * by selecting its number (the old number on a removed line, the new number otherwise). Comments
 * show under their line; on added and unchanged lines they are the same comments as the File tab's.
 */
export function DiffTable({
  review_id,
  revision_id,
  hunks,
  hidden_after,
  comments,
  can_comment,
  label,
}: DiffTableProps): ReactElement {
  const t = useTranslations("review");
  const [open_key, set_open_key] = useState<string | null>(null);
  const comments_by_line = group_line_comments(comments);
  const labels = { removed: t("changes.removed"), added: t("changes.added") };

  function number_cell(line: DiffLine, side: LineSide): ReactElement {
    const number =
      side === "old"
        ? line.kind === "added"
          ? null
          : line.old_number
        : line.kind === "removed"
          ? null
          : line.new_number;
    const anchor = anchor_of(line);
    const is_anchor = anchor.side === side && number !== null;
    const key = line_key(side, number ?? 0);
    const has_comments = is_anchor && comments_by_line.has(key);
    const class_name = `${review_styles.diffNumber} ${has_comments ? review_styles.commentedNumber : ""}`;

    if (!is_anchor || !can_comment) return <td className={class_name}>{number}</td>;
    return (
      <td className={class_name}>
        <button
          type="button"
          className={review_styles.lineButton}
          aria-label={t(side === "old" ? "comment.lineButtonOld" : "comment.lineButton", { line: number })}
          aria-expanded={open_key === key}
          onClick={() => set_open_key(open_key === key ? null : key)}
        >
          {number}
        </button>
      </td>
    );
  }

  function hidden_row(count: number): ReactElement {
    return (
      <tr data-kind="hidden">
        <td colSpan={3}>{t("changes.hidden", { count })}</td>
      </tr>
    );
  }

  return (
    // Focusable so keyboard users can scroll wide lines
    <div className={review_styles.codeScroller} tabIndex={0} aria-label={label}>
      <table className={`${review_styles.codeTable} ${styles.diff}`}>
        <tbody>
          {hunks.map((hunk, hunk_index) => (
            <Fragment key={hunk_index}>
              {hunk.hidden_before > 0 && hidden_row(hunk.hidden_before)}
              {hunk.lines.map((line, line_index) => {
                const anchor = anchor_of(line);
                const key = line_key(anchor.side, anchor.line_number);
                const line_comments = comments_by_line.get(key) ?? [];
                const is_open = open_key === key;
                const marker = line.kind === "added" ? "+" : line.kind === "removed" ? "−" : " ";
                return (
                  <Fragment key={line_index}>
                    <tr data-kind={line.kind}>
                      {number_cell(line, "old")}
                      {number_cell(line, "new")}
                      <td className={review_styles.diffCode}>
                        {line.kind !== "same" && (
                          <span className={utility_styles.visuallyHidden}>{labels[line.kind]}: </span>
                        )}
                        <span aria-hidden="true" className={styles.diffMarker}>
                          {marker}
                        </span>
                        {line.text}
                      </td>
                    </tr>
                    {(line_comments.length > 0 || is_open) && (
                      <tr className={review_styles.threadRow}>
                        <td colSpan={3}>
                          <LineThread
                            review_id={review_id}
                            revision_id={revision_id}
                            line_number={anchor.line_number}
                            side={anchor.side}
                            comments={line_comments}
                            is_form_open={is_open}
                            on_close={() => set_open_key(null)}
                          />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </Fragment>
          ))}
          {hidden_after > 0 && hidden_row(hidden_after)}
        </tbody>
      </table>
    </div>
  );
}
