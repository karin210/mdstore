import { getTranslations } from "next-intl/server";
import { Fragment, type ReactElement } from "react";
import { DiffTable } from "@/components/review/DiffTable/DiffTable";
import type { LineComment } from "@/components/review/LineThread/LineThread";
import { count_hidden_after, diff_lines, group_into_hunks } from "@/lib/review/diffLines";
import { diff_listing_fields, get_base_revision } from "@/lib/review/reviewView";
import type { Review, Revision } from "@/lib/review/types";
import { splitFileLines } from "@/lib/splitFileLines";
import review_styles from "@/styles/review.module.css";
import styles from "./RevisionChanges.module.css";

interface RevisionChangesProps {
  revision: Revision;
  review: Review;
  revisions: Revision[];
  /** The revision's line comments, on both sides. */
  comments: LineComment[];
  /** Authors and admins of a review in progress who have a username. */
  can_comment: boolean;
}

/**
 * What a revision changed: the listing fields that differ, then the file as a unified diff with
 * a few unchanged lines around each change, where reviewers comment on lines as in a pull request.
 * Compared with the previous revision of the review, or with the live version for the first
 * revision of a proposed change.
 */
export async function RevisionChanges({
  revision,
  review,
  revisions,
  comments,
  can_comment,
}: RevisionChangesProps): Promise<ReactElement> {
  const t = await getTranslations("review");
  const base = get_base_revision(revision, review, revisions);
  const base_is_live = base !== null && base.review_id !== review.id;
  const lines = diff_lines(base ? splitFileLines(base.content) : [], splitFileLines(revision.content));
  // Unchanged lines with comments stay visible, so no thread hides in a collapsed stretch.
  const commented_new_lines = new Set(
    comments.filter((comment) => comment.side === "new").map((comment) => comment.line_number),
  );
  const hunks = group_into_hunks(lines, 3, (line) => line.kind === "same" && commented_new_lines.has(line.new_number));
  const hidden_after = count_hidden_after(lines, hunks);
  const added = lines.filter((line) => line.kind === "added").length;
  const removed = lines.filter((line) => line.kind === "removed").length;
  const field_changes = base ? diff_listing_fields(base, revision) : [];

  return (
    <div className={styles.changes}>
      <p className={review_styles.muted}>
        {base === null
          ? t("changes.against.none", { number: revision.number })
          : t(base_is_live ? "changes.against.live" : "changes.against.previous", {
              number: revision.number,
              base: base.number,
            })}
      </p>

      {base && (
        <section className={review_styles.card} aria-labelledby="changes-fields-title">
          <h2 id="changes-fields-title" className={review_styles.cardTitle}>
            {t("changes.fieldsTitle")}
          </h2>
          {field_changes.length === 0 ? (
            <p className={review_styles.muted}>{t("changes.noFieldChanges")}</p>
          ) : (
            <dl className={styles.fieldChanges}>
              {field_changes.map((change) => (
                <Fragment key={change.field}>
                  <dt>{t(`file.fields.${change.field}`)}</dt>
                  <dd>
                    <p className={styles.fieldBefore}>
                      <span className={styles.fieldLabel}>{t("changes.before")}</span>
                      {change.before}
                    </p>
                    <p className={styles.fieldAfter}>
                      <span className={styles.fieldLabel}>{t("changes.after")}</span>
                      {change.after}
                    </p>
                  </dd>
                </Fragment>
              ))}
            </dl>
          )}
        </section>
      )}

      <section className={review_styles.card} aria-labelledby="changes-file-title">
        <h2 id="changes-file-title" className={review_styles.cardTitle}>
          {t("changes.fileTitle")} <code className={review_styles.fileName}>{revision.file_name}</code>
        </h2>
        {hunks.length === 0 ? (
          <p className={review_styles.muted}>{t("changes.noFileChanges")}</p>
        ) : (
          <>
            <p className={review_styles.muted}>{t("changes.summary", { added, removed })}</p>
            {can_comment && <p className={review_styles.muted}>{t("changes.lineHelp")}</p>}
            <DiffTable
              review_id={review.id}
              revision_id={revision.id}
              hunks={hunks}
              hidden_after={hidden_after}
              comments={comments}
              can_comment={can_comment}
              label={t("changes.fileTitle")}
            />
          </>
        )}
      </section>
    </div>
  );
}
