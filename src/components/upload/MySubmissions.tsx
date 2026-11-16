import { getTranslations } from "next-intl/server";
import type { ReactElement } from "react";
import { Link } from "@/i18n/navigation";
import { getSignedInUser } from "@/server/auth/getSignedInUser";
import { getMySubmissions } from "@/server/prompts/mySubmissions";
import styles from "./MySubmissions.module.css";

/**
 * The posts the signed-in user owns or co-authors, with where each one is in its review. Renders
 * nothing for visitors who aren't signed in. Every post links to its review (feedback, revisions,
 * co-authors); live ones also link to their public page.
 */
export async function MySubmissions(): Promise<ReactElement | null> {
  const user = await getSignedInUser();
  if (!user) return null;

  const t = await getTranslations("upload");
  const submissions = await getMySubmissions(user.id);

  return (
    <section className={styles.card} aria-labelledby="my-submissions-title">
      <h2 id="my-submissions-title" className={styles.heading}>
        {t("submissions.title")}
      </h2>
      <p className={styles.lead}>{t("submissions.lead")}</p>
      {submissions.length === 0 ? (
        <p className={styles.empty}>{t("submissions.empty")}</p>
      ) : (
        <ul className={styles.list}>
          {submissions.map((submission) => (
            <li key={submission.slug} className={styles.item} data-status={submission.status}>
              <div className={styles.header}>
                <p className={styles.title}>{submission.title}</p>
                <p className={styles.badge}>{t(`submissions.status.${submission.status}`)}</p>
              </div>
              <p className={styles.meta}>
                {t(`form.fields.kind.options.${submission.kind}`)} · {t(`submissions.role.${submission.role}`)}
              </p>
              {submission.status === "approved" && submission.latest_review_status && (
                <p className={styles.note}>{t(`submissions.liveReview.${submission.latest_review_status}`)}</p>
              )}
              <p className={styles.links}>
                <Link className={styles.link} href={`/prompts/${submission.slug}/review`}>
                  {t("submissions.openReview")}
                </Link>
                {submission.status === "approved" && (
                  <Link className={styles.link} href={`/prompts/${submission.slug}`}>
                    {t("submissions.view")}
                  </Link>
                )}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
