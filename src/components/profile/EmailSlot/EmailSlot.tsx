import { getTranslations } from "next-intl/server";
import type { ReactElement } from "react";
import { ChangeEmailForm } from "@/components/profile/ChangeEmailForm/ChangeEmailForm";
import { require_account_profile } from "@/server/profiles/requireAccountProfile";
import styles from "./EmailSlot.module.css";

/** The email section's content: which address is in use now, and the form to move to another. Reads the session. */
export async function EmailSlot(): Promise<ReactElement> {
  const profile = await require_account_profile("/profile");
  const t = await getTranslations("account.profile.email");

  return (
    <>
      <p className={styles.lead}>{t("lead", { email: profile.email ?? "" })}</p>
      <ChangeEmailForm />
    </>
  );
}
