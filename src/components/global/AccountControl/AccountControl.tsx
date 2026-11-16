"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { useEffect, useState, type ReactElement } from "react";
import { LogOutIcon } from "@/components/global/icons/icons";
import { Link, useRouter } from "@/i18n/navigation";
import { createBrowserSupabase } from "@/lib/supabase/browserClient";
import { getSupabaseEnv } from "@/lib/supabase/env";
import styles from "./AccountControl.module.css";

type AccountState = "unknown" | "signedOut" | "signedIn";

/**
 * Header control: "Sign in" for visitors, "Sign out" for signed-in users.
 * It also listens for auth changes (here or in another tab) and refreshes the server-rendered
 * parts of the page, so a signed-out user immediately loses the upload form. The server checks
 * the session on every post anyway; this only keeps the UI honest.
 */
export function AccountControl(): ReactElement {
  const t = useTranslations("auth.account");
  const router = useRouter();
  // Without Supabase settings nobody can sign in, so the state is known from the start.
  const [accountState, setAccountState] = useState<AccountState>(() => (getSupabaseEnv() ? "unknown" : "signedOut"));

  useEffect(() => {
    const supabase = createBrowserSupabase();
    if (!supabase) return;
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      setAccountState(session ? "signedIn" : "signedOut");
      if (event === "SIGNED_IN" || event === "SIGNED_OUT") router.refresh();
    });
    return () => data.subscription.unsubscribe();
  }, [router]);

  async function signOut(): Promise<void> {
    // Clears the session cookies; the SIGNED_OUT event above refreshes the page.
    await createBrowserSupabase()?.auth.signOut();
  }

  if (accountState === "signedIn") {
    return (
      // Tertiary kind: account setting, no acquisition intent
      <button
        type="button"
        className={styles.signOut}
        onClick={signOut}
        aria-label={t("signOut")}
        title={t("signOut")}
      >
        <span className={styles.label}>{t("signOut")}</span>
        <span className={styles.icon} aria-hidden="true">
          <LogOutIcon />
        </span>
      </button>
    );
  }

  return (
    // Hidden (but keeping its space) until the session is known, so it doesn't flash "Sign in".
    <Link
      href="/login"
      className={styles.signIn}
      data-ready={accountState !== "unknown"}
      aria-label={t("signIn")}
      title={t("signIn")}
    >
      <span className={styles.label}>{t("signIn")}</span>
      <span className={styles.icon} aria-hidden="true">
        <Image src="/sign-in-icon.svg" alt="" width={20} height={20} unoptimized />
      </span>
    </Link>
  );
}
