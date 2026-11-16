import { getTranslations } from "next-intl/server";
import type { ReactElement } from "react";
import { PickUsernameForm } from "@/components/shared/PickUsernameForm/PickUsernameForm";
import { SecondaryButton } from "@/components/shared/SecondaryButton/SecondaryButton";
import { InviteAccept } from "@/components/review/InviteAccept/InviteAccept";
import { get_signed_in_profile } from "@/server/profiles/profiles";
import { get_post_invite } from "@/server/reviews/invites";
import review_page_styles from "@/styles/reviewPage.module.css";
import review_styles from "@/styles/review.module.css";
import section_styles from "@/styles/section.module.css";

/** The invite page's content: sign in, pick a username if needed, then accept. */
export async function InviteBody({ params }: { params: Promise<{ token: string }> }): Promise<ReactElement> {
  const { token } = await params;
  const t = await getTranslations("review.invite");
  const profile = await get_signed_in_profile();

  if (!profile) {
    return (
      <section className={review_styles.card}>
        <p className={section_styles.eyebrow}>{t("eyebrow")}</p>
        <p>{t("signedOut")}</p>
        <div>
          <SecondaryButton href={{ pathname: "/login", query: { mode: "signIn", next: `/invite/${token}` } }}>
            {t("signIn")}
          </SecondaryButton>
        </div>
      </section>
    );
  }
  if (!profile.username) {
    return (
      <section className={review_styles.card}>
        <p className={section_styles.eyebrow}>{t("eyebrow")}</p>
        <PickUsernameForm />
      </section>
    );
  }

  const invite = await get_post_invite(token);
  if (!invite || invite.invite_state !== "valid") {
    const state: "used" | "expired" | "unknown" =
      invite?.invite_state === "used" || invite?.invite_state === "expired" ? invite.invite_state : "unknown";
    return (
      <section className={review_styles.card}>
        <p className={section_styles.eyebrow}>{t("eyebrow")}</p>
        <p role="status">{t(`states.${state}`)}</p>
      </section>
    );
  }

  return (
    <section className={review_styles.card} aria-labelledby="invite-title">
      <p className={section_styles.eyebrow}>{t("eyebrow")}</p>
      <h1 id="invite-title" className={review_page_styles.title}>
        {t("title", { title: invite.title })}
      </h1>
      <p className={review_styles.muted}>{t("lead")}</p>
      <InviteAccept token={token} />
    </section>
  );
}
