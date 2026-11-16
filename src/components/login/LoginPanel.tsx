"use client";

import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useRef, useState, useTransition, type KeyboardEvent, type ReactElement } from "react";
import { FormAlert } from "@/components/global/FormAlert";
import { SignInForm } from "@/components/login/SignInForm";
import { SignUpForm } from "@/components/login/SignUpForm";
import type { CredentialValues } from "@/lib/forms/credentialForms";
import { getSafeRedirectPath } from "@/lib/safeRedirect";
import { signIn, signUp, type AuthActionResult } from "@/server/auth/actions";
import styles from "./LoginPanel.module.css";

type LoginMode = "signUp" | "signIn";

/** Most visitors arrive from "Upload your prompts" without an account, so sign-up comes first. */
const MODES: LoginMode[] = ["signUp", "signIn"];

/**
 * The login card. It owns the mode (tab), the return path and the submission state, and passes
 * them to the active form; each form owns its own fields. Only the active form is mounted, so it
 * starts fresh whenever its tab is selected.
 */
export function LoginPanel(): ReactElement {
  const t = useTranslations("auth");
  const locale = useLocale();
  const searchParams = useSearchParams();
  const nextPath = getSafeRedirectPath(searchParams.get("next"));
  const [mode, setMode] = useState<LoginMode>(searchParams.get("mode") === "signIn" ? "signIn" : "signUp");
  const [errorMessage, setErrorMessage] = useState(
    searchParams.get("error") === "confirm" ? t("errors.confirmFailed") : "",
  );
  const [confirmationEmail, setConfirmationEmail] = useState("");
  const [is_username_taken, set_is_username_taken] = useState(false);
  const [isSubmitting, startSubmit] = useTransition();
  const tabRefs = useRef<Record<LoginMode, HTMLButtonElement | null>>({ signUp: null, signIn: null });

  function selectMode(nextMode: LoginMode, shouldFocus = false): void {
    setMode(nextMode);
    setErrorMessage("");
    setConfirmationEmail("");
    set_is_username_taken(false);
    if (shouldFocus) tabRefs.current[nextMode]?.focus();
  }

  function moveBetweenTabs(event: KeyboardEvent<HTMLDivElement>): void {
    const currentIndex = MODES.indexOf(mode);
    const targetIndex: Record<string, number> = {
      ArrowRight: (currentIndex + 1) % MODES.length,
      ArrowLeft: (currentIndex - 1 + MODES.length) % MODES.length,
      Home: 0,
      End: MODES.length - 1,
    };
    if (!(event.key in targetIndex)) return;
    event.preventDefault();
    selectMode(MODES[targetIndex[event.key]], true);
  }

  function showResult(result: AuthActionResult): void {
    if (result.status === "checkEmail") setConfirmationEmail(result.email);
    else if (result.status === "invalid") {
      setErrorMessage(t("errors.fixFields"));
      if (result.fieldErrors.username === "usernameTaken") {
        set_is_username_taken(true);
        document.getElementById("sign-up-username")?.focus();
      }
    } else setErrorMessage(t(`errors.${result.errorKey}`, { requestId: result.requestId ?? "" }));
  }

  function submitCredentials(values: CredentialValues & { username?: string }): void {
    setErrorMessage("");
    set_is_username_taken(false);
    startSubmit(async () => {
      const submitAction = mode === "signUp" ? signUp : signIn;
      // On success the action redirects, so a result only comes back when something needs showing.
      showResult(await submitAction({ ...values, locale, next: nextPath }));
    });
  }

  const tabId = (tabMode: LoginMode): string => `login-tab-${tabMode}`;

  return (
    <section className={styles.card} aria-labelledby="login-title">
      <div className={styles.tabs} role="tablist" aria-label={t("tabs.label")} onKeyDown={moveBetweenTabs}>
        {MODES.map((tabMode) => (
          <button
            key={tabMode}
            ref={(element) => {
              tabRefs.current[tabMode] = element;
            }}
            id={tabId(tabMode)}
            type="button"
            role="tab"
            className={styles.tab}
            aria-selected={mode === tabMode}
            aria-controls="login-tabpanel"
            tabIndex={mode === tabMode ? 0 : -1}
            onClick={() => selectMode(tabMode)}
          >
            {t(`tabs.${tabMode}`)}
          </button>
        ))}
      </div>

      <div id="login-tabpanel" className={styles.panel} role="tabpanel" aria-labelledby={tabId(mode)}>
        <header className={styles.heading}>
          <h1 id="login-title" className={styles.title}>
            {t(`headings.${mode}`)}
          </h1>
          <p className={styles.lead}>{t(`leads.${mode}`)}</p>
        </header>

        {confirmationEmail ? (
          <FormAlert tone="success">{t("results.checkEmail", { email: confirmationEmail })}</FormAlert>
        ) : mode === "signUp" ? (
          <SignUpForm
            isSubmitting={isSubmitting}
            errorMessage={errorMessage}
            isUsernameTaken={is_username_taken}
            onUsernameEdited={() => set_is_username_taken(false)}
            onSubmit={submitCredentials}
          />
        ) : (
          <SignInForm isSubmitting={isSubmitting} errorMessage={errorMessage} onSubmit={submitCredentials} />
        )}
      </div>
    </section>
  );
}
