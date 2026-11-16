import { getTranslations } from "next-intl/server";
import type { ReactElement } from "react";
import { review_href } from "@/components/review/reviewHref/reviewHref";
import { Link } from "@/i18n/navigation";
import { build_timeline } from "@/lib/review/reviewView";
import type { Review, ReviewComment, Revision } from "@/lib/review/types";
import { splitFileLines } from "@/lib/splitFileLines";
import styles from "@/components/review/shared/Review.module.css";

interface ReviewTimelineProps {
  slug: string;
  review: Review;
  is_latest: boolean;
  revisions: Revision[];
  comments: ReviewComment[];
  name_of: (user_id: string | null) => string;
  format_date: (iso: string) => string;
}

/** The conversation of one review: revisions pushed, comments (on the review or on a line) and decisions. */
export async function ReviewTimeline({
  slug,
  review,
  is_latest,
  revisions,
  comments,
  name_of,
  format_date,
}: ReviewTimelineProps): Promise<ReactElement> {
  const t = await getTranslations("review.timeline");
  const items = build_timeline(review, revisions, comments);
  const revisions_by_id = new Map(revisions.map((revision) => [revision.id, revision]));
  const review_number = is_latest ? undefined : review.number;

  return (
    <ol className={styles.timeline}>
      {items.map((item) => {
        if (item.kind === "revision") {
          const { revision } = item;
          return (
            <li key={`revision-${revision.id}`} className={styles.event} data-kind="revision">
              <p className={styles.eventHeader}>
                <strong>{t("revision", { username: name_of(revision.created_by), number: revision.number })}</strong>
                <time dateTime={revision.created_at}>{format_date(revision.created_at)}</time>
              </p>
              <p className={styles.eventLinks}>
                <Link href={review_href(slug, { review: review_number, tab: "file", revision: revision.number })}>
                  {t("viewRevision")}
                </Link>
                <Link href={review_href(slug, { review: review_number, tab: "changes", revision: revision.number })}>
                  {t("viewChanges")}
                </Link>
              </p>
            </li>
          );
        }

        const { comment } = item;
        const username = name_of(comment.author_id);
        const line_revision = comment.revision_id ? revisions_by_id.get(comment.revision_id) : undefined;
        const line_text =
          line_revision && comment.line_number ? splitFileLines(line_revision.content)[comment.line_number - 1] : null;
        const heading = comment.decision
          ? t(`decision.${comment.decision}`, { username })
          : line_revision && comment.line_number
            ? t("lineComment", { username, line: comment.line_number, number: line_revision.number })
            : t("comment", { username });

        return (
          <li
            key={`comment-${comment.id}`}
            className={styles.event}
            data-kind={comment.decision ? "decision" : "comment"}
            data-decision={comment.decision ?? undefined}
          >
            <p className={styles.eventHeader}>
              <strong>{heading}</strong>
              <time dateTime={comment.created_at}>{format_date(comment.created_at)}</time>
            </p>
            {line_text !== null && line_text !== undefined && line_revision && (
              <Link
                className={styles.quotedLine}
                href={review_href(slug, { review: review_number, tab: "file", revision: line_revision.number })}
              >
                <span className={styles.lineNumber}>{comment.line_number}</span>
                <code>{line_text || " "}</code>
              </Link>
            )}
            {comment.body && <p className={styles.body}>{comment.body}</p>}
          </li>
        );
      })}
    </ol>
  );
}
