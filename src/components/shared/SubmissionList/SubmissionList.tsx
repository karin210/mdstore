import { getFormatter, getTranslations } from "next-intl/server";
import type { ReactElement } from "react";
import { Link } from "@/i18n/navigation";
import type { MySubmission } from "@/server/prompts/mySubmissions";
import styles from "./SubmissionList.module.css";

interface SubmissionListProps {
  /** Already in display order (newest first) and already cut to length by the caller. */
  submissions: MySubmission[];
}

/**
 * The posts a user owns or co-authors, with the date each one was posted and where it is in its
 * review. Used by /my-prompts (all of them) and /profile (the latest five). Every post links to its
 * review (feedback, revisions, co-authors); live ones also link to their public page.
 */
export async function SubmissionList({ submissions }: SubmissionListProps): Promise<ReactElement> {
  const t = await getTranslations("account.submissions");
  const format = await getFormatter();

  if (submissions.length === 0) return <p className={styles.empty}>{t("empty")}</p>;

  return (
    <ul className={styles.list}>
      {submissions.map((submission) => (
        <li key={submission.slug} className={styles.item} data-status={submission.status}>
          <div className={styles.header}>
            <p className={styles.title}>{submission.title}</p>
            <p className={styles.badge}>{t(`status.${submission.status}`)}</p>
          </div>
          <p className={styles.meta}>
            {t(`kind.${submission.kind}`)} · {t(`role.${submission.role}`)} ·{" "}
            <time dateTime={submission.created_at}>
              {t("posted", {
                date: format.dateTime(new Date(submission.created_at), { dateStyle: "medium", timeZone: "UTC" }),
              })}
            </time>
          </p>
          {submission.status === "approved" && submission.latest_review_status && (
            <p className={styles.note}>{t(`liveReview.${submission.latest_review_status}`)}</p>
          )}
          <p className={styles.links}>
            <Link className={styles.link} href={`/prompts/${submission.slug}/review`}>
              {t("openReview")}
            </Link>
            {submission.status === "approved" && (
              <Link className={styles.link} href={`/prompts/${submission.slug}`}>
                {t("view")}
              </Link>
            )}
          </p>
        </li>
      ))}
    </ul>
  );
}
