import { getTranslations } from "next-intl/server";
import { Fragment, type ReactElement } from "react";
import { count_hidden_after, diff_lines, group_into_hunks, type DiffLine } from "@/lib/review/diffLines";
import { diff_listing_fields, get_base_revision } from "@/lib/review/reviewView";
import type { Review, Revision } from "@/lib/review/types";
import { splitFileLines } from "@/lib/splitFileLines";
import styles from "./Review.module.css";

interface RevisionChangesProps {
  revision: Revision;
  review: Review;
  revisions: Revision[];
}

function DiffRow({ line, labels }: { line: DiffLine; labels: { removed: string; added: string } }): ReactElement {
  const old_number = line.kind === "added" ? "" : line.old_number;
  const new_number = line.kind === "removed" ? "" : line.new_number;
  const marker = line.kind === "added" ? "+" : line.kind === "removed" ? "−" : " ";

  return (
    <tr data-kind={line.kind}>
      <td className={styles.diffNumber}>{old_number}</td>
      <td className={styles.diffNumber}>{new_number}</td>
      <td className={styles.diffCode}>
        {line.kind !== "same" && <span className="visually-hidden">{labels[line.kind]}: </span>}
        <span aria-hidden="true" className={styles.diffMarker}>
          {marker}
        </span>
        {line.text}
      </td>
    </tr>
  );
}

/**
 * What a revision changed: the listing fields that differ, then the file as a unified diff with
 * a few unchanged lines around each change. Compared with the previous revision of the review,
 * or with the live version for the first revision of a proposed change.
 */
export async function RevisionChanges({ revision, review, revisions }: RevisionChangesProps): Promise<ReactElement> {
  const t = await getTranslations("review");
  const base = get_base_revision(revision, review, revisions);
  const base_is_live = base !== null && base.review_id !== review.id;
  const lines = diff_lines(base ? splitFileLines(base.content) : [], splitFileLines(revision.content));
  const hunks = group_into_hunks(lines);
  const hidden_after = count_hidden_after(lines, hunks);
  const added = lines.filter((line) => line.kind === "added").length;
  const removed = lines.filter((line) => line.kind === "removed").length;
  const field_changes = base ? diff_listing_fields(base, revision) : [];
  const labels = { removed: t("changes.removed"), added: t("changes.added") };

  return (
    <div className={styles.changes}>
      <p className={styles.muted}>
        {base === null
          ? t("changes.against.none", { number: revision.number })
          : t(base_is_live ? "changes.against.live" : "changes.against.previous", {
              number: revision.number,
              base: base.number,
            })}
      </p>

      {base && (
        <section className={styles.card} aria-labelledby="changes-fields-title">
          <h2 id="changes-fields-title" className={styles.cardTitle}>
            {t("changes.fieldsTitle")}
          </h2>
          {field_changes.length === 0 ? (
            <p className={styles.muted}>{t("changes.noFieldChanges")}</p>
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

      <section className={styles.card} aria-labelledby="changes-file-title">
        <h2 id="changes-file-title" className={styles.cardTitle}>
          {t("changes.fileTitle")} <code className={styles.fileName}>{revision.file_name}</code>
        </h2>
        {hunks.length === 0 ? (
          <p className={styles.muted}>{t("changes.noFileChanges")}</p>
        ) : (
          <>
            <p className={styles.muted}>{t("changes.summary", { added, removed })}</p>
            {/* Focusable so keyboard users can scroll wide lines */}
            <div className={styles.codeScroller} tabIndex={0} aria-label={t("changes.fileTitle")}>
              <table className={styles.diff}>
                <tbody>
                  {hunks.map((hunk, index) => (
                    <Fragment key={index}>
                      {hunk.hidden_before > 0 && (
                        <tr data-kind="hidden">
                          <td colSpan={3}>{t("changes.hidden", { count: hunk.hidden_before })}</td>
                        </tr>
                      )}
                      {hunk.lines.map((line, line_index) => (
                        <DiffRow key={line_index} line={line} labels={labels} />
                      ))}
                    </Fragment>
                  ))}
                  {hidden_after > 0 && (
                    <tr data-kind="hidden">
                      <td colSpan={3}>{t("changes.hidden", { count: hidden_after })}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
