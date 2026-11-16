"use client";

import { useTranslations } from "next-intl";
import { Fragment, useState, type ReactElement } from "react";
import { CommentForm } from "@/components/review/CommentForm/CommentForm";
import review_styles from "@/styles/review.module.css";
import styles from "./RevisionFile.module.css";

export interface LineComment {
  id: string;
  line_number: number;
  username: string;
  body: string;
  date: string;
}

interface RevisionFileProps {
  review_id: string;
  revision_id: string;
  file_name: string;
  lines: string[];
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
  const comments_by_line = new Map<number, LineComment[]>();
  comments.forEach((comment) => {
    comments_by_line.set(comment.line_number, [...(comments_by_line.get(comment.line_number) ?? []), comment]);
  });

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
        <table className={`${review_styles.codeTable} ${styles.fileTable}`}>
          <tbody>
            {lines.map((line, index) => {
              const line_number = index + 1;
              const line_comments = comments_by_line.get(line_number) ?? [];
              return (
                <Fragment key={line_number}>
                  <tr data-commented={line_comments.length > 0 || undefined}>
                    <td className={`${review_styles.diffNumber} ${styles.commentedNumber}`}>
                      {can_comment ? (
                        <button
                          type="button"
                          className={styles.lineButton}
                          aria-label={t("comment.lineButton", { line: line_number })}
                          aria-expanded={open_line === line_number}
                          onClick={() => set_open_line(open_line === line_number ? null : line_number)}
                        >
                          {line_number}
                        </button>
                      ) : (
                        line_number
                      )}
                    </td>
                    <td className={review_styles.diffCode}>{line || " "}</td>
                  </tr>
                  {(line_comments.length > 0 || open_line === line_number) && (
                    <tr data-kind="thread">
                      <td colSpan={2}>
                        <div className={styles.lineThread}>
                          {line_comments.map((comment) => (
                            <article key={comment.id} className={styles.lineComment}>
                              <p className={review_styles.eventHeader}>
                                <strong>@{comment.username}</strong>
                                <span>{comment.date}</span>
                              </p>
                              <p className={review_styles.body}>{comment.body}</p>
                            </article>
                          ))}
                          {open_line === line_number && (
                            <CommentForm
                              review_id={review_id}
                              line={{ revision_id, line_number }}
                              onDone={() => set_open_line(null)}
                            />
                          )}
                        </div>
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
