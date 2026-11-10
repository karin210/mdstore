"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState, type ReactElement } from "react";
import { Link, useRouter } from "@/i18n/navigation";
import { create_browser_supabase } from "@/lib/supabase/browserClient";
import { get_supabase_env } from "@/lib/supabase/env";
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
  const [account_state, set_account_state] = useState<AccountState>(() =>
    get_supabase_env() ? "unknown" : "signedOut",
  );

  useEffect(() => {
    const supabase = create_browser_supabase();
    if (!supabase) return;
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      set_account_state(session ? "signedIn" : "signedOut");
      if (event === "SIGNED_IN" || event === "SIGNED_OUT") router.refresh();
    });
    return () => data.subscription.unsubscribe();
  }, [router]);

  async function sign_out(): Promise<void> {
    // Clears the session cookies; the SIGNED_OUT event above refreshes the page.
    await create_browser_supabase()?.auth.signOut();
  }

  if (account_state === "signedIn") {
    return (
      // Tertiary kind: account setting, no acquisition intent
      <button type="button" className={styles.signOut} onClick={sign_out}>
        {t("signOut")}
      </button>
    );
  }

  return (
    // Hidden (but keeping its space) until the session is known, so it doesn't flash "Sign in".
    <Link href="/login" className={styles.signIn} data-ready={account_state !== "unknown"}>
      {t("signIn")}
    </Link>
  );
}
