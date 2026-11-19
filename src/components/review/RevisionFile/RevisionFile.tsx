"use client";

import { useTranslations } from "next-intl";
import { Fragment, useState, type ReactElement } from "react";
import { group_line_comments, line_key, LineThread, type LineComment } from "@/components/review/LineThread/LineThread";
import review_styles from "@/styles/review.module.css";

interface RevisionFileProps {
  review_id: string;
  revision_id: string;
  file_name: string;
  lines: string[];
  /** The revision's comments on its own file (the "new" side). */
  comments: LineComment[];
  /** Authors and admins of a review in progress who have a username. */
  can_comment: boolean;
}

/**
 * A revision's file with line numbers. Comments on a line show under it; reviewers open a comment
 * form on any line by selecting its number. Comments belong to this revision: a later revision
 * shows its own, and the conversation keeps every one with the line it was about.
 */
export function RevisionFile({
  review_id,
  revision_id,
  file_name,
  lines,
  comments,
  can_comment,
}: RevisionFileProps): ReactElement {
  const t = useTranslations("review");
  const [open_line, set_open_line] = useState<number | null>(null);
  const comments_by_line = group_line_comments(comments);

  return (
    <div className={review_styles.card}>
      <p className={review_styles.cardTitle}>
        <code className={review_styles.fileName}>
          {t("file.fileLabel", { fileName: file_name, count: lines.length })}
        </code>
      </p>
      {can_comment && <p className={review_styles.muted}>{t("file.lineHelp")}</p>}
      {/* Focusable so keyboard users can scroll wide lines */}
      <div className={review_styles.codeScroller} tabIndex={0} aria-label={file_name}>
        <table className={review_styles.codeTable}>
          <tbody>
            {lines.map((line, index) => {
              const line_number = index + 1;
              const line_comments = comments_by_line.get(line_key("new", line_number)) ?? [];
              const is_open = open_line === line_number;
              return (
                <Fragment key={line_number}>
                  <tr>
                    <td
                      className={`${review_styles.diffNumber} ${line_comments.length > 0 ? review_styles.commentedNumber : ""}`}
                    >
                      {can_comment ? (
                        <button
                          type="button"
                          className={review_styles.lineButton}
                          aria-label={t("comment.lineButton", { line: line_number })}
                          aria-expanded={is_open}
                          onClick={() => set_open_line(is_open ? null : line_number)}
                        >
                          {line_number}
                        </button>
                      ) : (
                        line_number
                      )}
                    </td>
                    <td className={review_styles.diffCode}>{line || " "}</td>
                  </tr>
                  {(line_comments.length > 0 || is_open) && (
                    <tr className={review_styles.threadRow}>
                      <td colSpan={2}>
                        <LineThread
                          review_id={review_id}
                          revision_id={revision_id}
                          line_number={line_number}
                          side="new"
                          comments={line_comments}
                          is_form_open={is_open}
                          on_close={() => set_open_line(null)}
                        />
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
