import { getTranslations } from "next-intl/server";
import type { ReactElement } from "react";
import { SubmissionList } from "@/components/shared/SubmissionList/SubmissionList";
import { Link } from "@/i18n/navigation";
import { getMySubmissions } from "@/server/prompts/mySubmissions";
import { require_account_profile } from "@/server/profiles/requireAccountProfile";
import styles from "./RecentUploads.module.css";

/** How many posts /profile shows; the rest are on /my-prompts. */
const RECENT_UPLOADS_LIMIT = 5;

/** The signed-in user's latest posts, newest first, and the way to all of them. Reads the session. */
export async function RecentUploads(): Promise<ReactElement> {
  const profile = await require_account_profile("/profile");
  const t = await getTranslations("account.profile.recent");
  // Already newest first; a user has few posts, so they are cut here rather than in the query.
  const submissions = await getMySubmissions(profile.user_id);

  return (
    <>
      <SubmissionList submissions={submissions.slice(0, RECENT_UPLOADS_LIMIT)} />
      {submissions.length > 0 && (
        <p className={styles.more}>
          <Link className={styles.link} href="/my-prompts">
            {t("showAll")}
          </Link>
        </p>
      )}
    </>
  );
}
