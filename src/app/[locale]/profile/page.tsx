import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import { Suspense, type ReactElement } from "react";
import { AccountDetails } from "@/components/profile/AccountDetails/AccountDetails";
import { ChangePasswordForm } from "@/components/profile/ChangePasswordForm/ChangePasswordForm";
import { EmailSlot } from "@/components/profile/EmailSlot/EmailSlot";
import { ProfileSection } from "@/components/profile/ProfileSection/ProfileSection";
import { RecentUploads } from "@/components/profile/RecentUploads/RecentUploads";
import { UsernameSlot } from "@/components/profile/UsernameSlot/UsernameSlot";
import type { RouteIndexSection } from "@/components/shared/RouteIndex/RouteIndex";
import { RouteIndexLayout } from "@/components/shared/RouteIndexLayout/RouteIndexLayout";
import { SkeletonBlock } from "@/components/shared/SkeletonBlock/SkeletonBlock";
import section_styles from "@/styles/section.module.css";
import styles from "./page.module.css";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("account.profile.meta");
  return { title: t("title"), robots: { index: false, follow: false } };
}

/** Placeholder with a section's shape while the session is read. */
function SlotSkeleton({ height }: { height: string }): ReactElement {
  return (
    <div aria-busy="true">
      <SkeletonBlock height={height} />
    </div>
  );
}

/**
 * The signed-in user's account: their details, their five latest uploads (all of them on
 * /my-prompts) and the forms to change their username, email and password. The headings render at
 * once; every part that reads the session renders inside <Suspense>. src/proxy.ts sends signed-out
 * visitors to /login first.
 */
export default function ProfilePage(): ReactElement {
  const t = useTranslations("account.profile");
  const sections: RouteIndexSection[] = [
    { id: "account", level: 1, label: t("outline.sections.account") },
    { id: "recent", level: 2, label: t("outline.sections.recent") },
    { id: "username", level: 2, label: t("outline.sections.username") },
    { id: "email", level: 2, label: t("outline.sections.email") },
    { id: "password", level: 2, label: t("outline.sections.password") },
  ];

  return (
    <RouteIndexLayout sections={sections} file_name={t("outline.file")} content_class_name={styles.content}>
      <section id="account" className={section_styles.pageSection} aria-labelledby="account-title">
        <header className={section_styles.sectionHeading}>
          <p className={section_styles.eyebrow}>{t("eyebrow")}</p>
          <h1 id="account-title" className={styles.title}>
            {t("title")}
          </h1>
          <p>{t("lead")}</p>
        </header>
        <div className={styles.card}>
          <Suspense fallback={<SlotSkeleton height="6rem" />}>
            <AccountDetails />
          </Suspense>
        </div>
      </section>
      <ProfileSection id="recent" title={t("recent.title")} lead={t("recent.lead")}>
        <Suspense fallback={<SlotSkeleton height="12rem" />}>
          <RecentUploads />
        </Suspense>
      </ProfileSection>
      <ProfileSection id="username" title={t("username.title")} lead={t("username.lead")}>
        <Suspense fallback={<SlotSkeleton height="7rem" />}>
          <UsernameSlot />
        </Suspense>
      </ProfileSection>
      <ProfileSection id="email" title={t("email.title")}>
        <Suspense fallback={<SlotSkeleton height="8rem" />}>
          <EmailSlot />
        </Suspense>
      </ProfileSection>
      <ProfileSection id="password" title={t("password.title")} lead={t("password.lead")}>
        <ChangePasswordForm />
      </ProfileSection>
    </RouteIndexLayout>
  );
}
