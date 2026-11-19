import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import { Suspense, type ReactElement } from "react";
import { MyPromptsList } from "@/components/my-prompts/MyPromptsList/MyPromptsList";
import { SecondaryButton } from "@/components/shared/SecondaryButton/SecondaryButton";
import { SkeletonBlock } from "@/components/shared/SkeletonBlock/SkeletonBlock";
import { Link } from "@/i18n/navigation";
import section_styles from "@/styles/section.module.css";
import styles from "./page.module.css";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("account.myPrompts.meta");
  return { title: t("title"), robots: { index: false, follow: false } };
}

/**
 * Every prompt, skill and agent the signed-in user owns or co-authors, newest first, each with its
 * review. One block, so no route index. The list reads the session, so it renders inside
 * <Suspense>; src/proxy.ts sends signed-out visitors to /login first.
 */
export default function MyPromptsPage(): ReactElement {
  const t = useTranslations("account.myPrompts");

  return (
    <main className={styles.main}>
      <header className={section_styles.sectionHeading}>
        <p className={section_styles.eyebrow}>{t("eyebrow")}</p>
        <h1 className={styles.title}>{t("title")}</h1>
        <p>{t("lead")}</p>
      </header>
      <div className={styles.actions}>
        <SecondaryButton href="/upload">{t("upload")}</SecondaryButton>
        <Link className={styles.back} href="/profile">
          {t("backToProfile")}
        </Link>
      </div>
      <Suspense
        fallback={
          <div aria-busy="true">
            <SkeletonBlock height="16rem" />
          </div>
        }
      >
        <MyPromptsList />
      </Suspense>
    </main>
  );
}
