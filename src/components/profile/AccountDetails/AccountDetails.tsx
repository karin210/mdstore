import { getFormatter, getTranslations } from "next-intl/server";
import type { ReactElement } from "react";
import { require_account_profile } from "@/server/profiles/requireAccountProfile";
import styles from "./AccountDetails.module.css";

/** The signed-in account at a glance: @username, email and since when. Reads the session. */
export async function AccountDetails(): Promise<ReactElement> {
  const profile = await require_account_profile("/profile");
  const t = await getTranslations("account.profile.details");
  const format = await getFormatter();

  return (
    <dl className={styles.details}>
      <div className={styles.row}>
        <dt>{t("username")}</dt>
        <dd className={styles.value}>{profile.username ? `@${profile.username}` : t("noUsername")}</dd>
      </div>
      <div className={styles.row}>
        <dt>{t("email")}</dt>
        <dd className={styles.value}>{profile.email}</dd>
      </div>
      {profile.member_since && (
        <div className={styles.row}>
          <dt>{t("memberSince")}</dt>
          <dd className={styles.value}>
            <time dateTime={profile.member_since}>
              {format.dateTime(new Date(profile.member_since), { dateStyle: "long", timeZone: "UTC" })}
            </time>
          </dd>
        </div>
      )}
    </dl>
  );
}
