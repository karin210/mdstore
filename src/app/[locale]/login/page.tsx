import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Suspense, type ReactElement } from "react";
import { SkeletonBlock } from "@/components/global/SkeletonBlock";
import { LoginPanel } from "@/components/login/LoginPanel";
import styles from "./page.module.css";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth.meta");

  return { title: t("title"), description: t("description"), robots: { index: false } };
}

/** Placeholder with the card's shape while the panel reads the URL. */
function LoginPanelSkeleton(): ReactElement {
  return (
    <div className={styles.skeleton} aria-busy="true">
      <SkeletonBlock height="3rem" />
      <SkeletonBlock width="60%" height="2.5rem" />
      <SkeletonBlock height="3rem" />
      <SkeletonBlock height="3rem" />
      <SkeletonBlock height="3rem" rounded />
    </div>
  );
}

/** Sign in or create an account (tabs on one card); required to post a prompt. */
export default function LoginPage(): ReactElement {
  return (
    <main className={styles.main}>
      {/* The panel reads ?next=, ?mode= and ?error= from the URL, which happens at request time. */}
      <Suspense fallback={<LoginPanelSkeleton />}>
        <LoginPanel />
      </Suspense>
    </main>
  );
}
