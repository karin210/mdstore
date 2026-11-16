import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import { Suspense, type ReactElement } from "react";
import { PickUsernameForm } from "@/components/global/PickUsernameForm/PickUsernameForm";
import { SecondaryButton } from "@/components/global/SecondaryButton/SecondaryButton";
import { SkeletonBlock } from "@/components/global/SkeletonBlock/SkeletonBlock";
import { MySubmissions } from "@/components/upload/MySubmissions/MySubmissions";
import { PostPromptForm } from "@/components/upload/PostPromptForm/PostPromptForm";
import { get_signed_in_profile } from "@/server/profiles/profiles";
import styles from "./PostPromptSection.module.css";

/**
 * The form's slot: the form for signed-in users with a username, the "pick your username" form
 * for older accounts without one, and an invitation to sign in for everyone else.
 * It reads the session, so it renders per request inside <Suspense>.
 */
async function PostPromptSlot(): Promise<ReactElement> {
  const t = await getTranslations("upload.form");
  const user = await get_signed_in_profile();

  if (!user) {
    return (
      <div className={styles.signedOut}>
        <p className={styles.signedOutText}>{t("signedOut.text")}</p>
        <SecondaryButton href={{ pathname: "/login", query: { next: "/upload" } }} size="large">
          {t("signedOut.action")}
        </SecondaryButton>
      </div>
    );
  }
  if (!user.username) return <PickUsernameForm />;
  return <PostPromptForm mode="create" email={user.email} username={user.username} />;
}

/** Placeholder with the form's shape while the session is checked. */
function PostPromptSkeleton(): ReactElement {
  return (
    <div className={styles.skeleton} aria-busy="true">
      <SkeletonBlock width="40%" height="1.5rem" />
      <SkeletonBlock height="3rem" />
      <SkeletonBlock height="3rem" />
      <SkeletonBlock height="7rem" />
    </div>
  );
}

/** The last section of /upload: where a signed-in user posts a prompt. */
export function PostPromptSection(): ReactElement {
  const t = useTranslations("upload.form");

  return (
    <section id="post-prompt" className="page-section" aria-labelledby="post-prompt-title">
      <header className="section-heading">
        <p className="eyebrow">{t("eyebrow")}</p>
        <h2 id="post-prompt-title">{t("title")}</h2>
        <p>{t("lead")}</p>
      </header>
      <div className={styles.card}>
        <Suspense fallback={<PostPromptSkeleton />}>
          <PostPromptSlot />
        </Suspense>
      </div>
      <Suspense fallback={null}>
        <MySubmissions />
      </Suspense>
    </section>
  );
}
