"use client";

import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useRef, useState, useTransition, type KeyboardEvent, type ReactElement } from "react";
import { FormAlert } from "@/components/global/FormAlert";
import { SignInForm } from "@/components/login/SignInForm";
import { SignUpForm } from "@/components/login/SignUpForm";
import type { CredentialValues } from "@/lib/forms/credentialForms";
import { get_safe_redirect_path } from "@/lib/safeRedirect";
import { sign_in, sign_up, type AuthActionResult } from "@/server/auth/actions";
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
  const search_params = useSearchParams();
  const next_path = get_safe_redirect_path(search_params.get("next"));
  const [mode, set_mode] = useState<LoginMode>(search_params.get("mode") === "signIn" ? "signIn" : "signUp");
  const [error_message, set_error_message] = useState(
    search_params.get("error") === "confirm" ? t("errors.confirmFailed") : "",
  );
  const [confirmation_email, set_confirmation_email] = useState("");
  const [is_submitting, start_submit] = useTransition();
  const tab_refs = useRef<Record<LoginMode, HTMLButtonElement | null>>({ signUp: null, signIn: null });

  function select_mode(next_mode: LoginMode, should_focus = false): void {
    set_mode(next_mode);
    set_error_message("");
    set_confirmation_email("");
    if (should_focus) tab_refs.current[next_mode]?.focus();
  }

  function move_between_tabs(event: KeyboardEvent<HTMLDivElement>): void {
    const current_index = MODES.indexOf(mode);
    const target_index: Record<string, number> = {
      ArrowRight: (current_index + 1) % MODES.length,
      ArrowLeft: (current_index - 1 + MODES.length) % MODES.length,
      Home: 0,
      End: MODES.length - 1,
    };
    if (!(event.key in target_index)) return;
    event.preventDefault();
    select_mode(MODES[target_index[event.key]], true);
  }

  function show_result(result: AuthActionResult): void {
    if (result.status === "check_email") set_confirmation_email(result.email);
    else if (result.status === "invalid") set_error_message(t("errors.fixFields"));
    else set_error_message(t(`errors.${result.error_key}`, { requestId: result.request_id ?? "" }));
  }

  function submit_credentials(values: CredentialValues): void {
    set_error_message("");
    start_submit(async () => {
      const submit_action = mode === "signUp" ? sign_up : sign_in;
      // On success the action redirects, so a result only comes back when something needs showing.
      show_result(await submit_action({ ...values, locale, next: next_path }));
    });
  }

  const tab_id = (tab_mode: LoginMode): string => `login-tab-${tab_mode}`;

  return (
    <section className={styles.card} aria-labelledby="login-title">
      <div className={styles.tabs} role="tablist" aria-label={t("tabs.label")} onKeyDown={move_between_tabs}>
        {MODES.map((tab_mode) => (
          <button
            key={tab_mode}
            ref={(element) => {
              tab_refs.current[tab_mode] = element;
            }}
            id={tab_id(tab_mode)}
            type="button"
            role="tab"
            className={styles.tab}
            aria-selected={mode === tab_mode}
            aria-controls="login-tabpanel"
            tabIndex={mode === tab_mode ? 0 : -1}
            onClick={() => select_mode(tab_mode)}
          >
            {t(`tabs.${tab_mode}`)}
          </button>
        ))}
      </div>

      <div id="login-tabpanel" className={styles.panel} role="tabpanel" aria-labelledby={tab_id(mode)}>
        <header className={styles.heading}>
          <h1 id="login-title" className={styles.title}>
            {t(`headings.${mode}`)}
          </h1>
          <p className={styles.lead}>{t(`leads.${mode}`)}</p>
        </header>

        {confirmation_email ? (
          <FormAlert tone="success">{t("results.checkEmail", { email: confirmation_email })}</FormAlert>
        ) : mode === "signUp" ? (
          <SignUpForm is_submitting={is_submitting} error_message={error_message} on_submit={submit_credentials} />
        ) : (
          <SignInForm is_submitting={is_submitting} error_message={error_message} on_submit={submit_credentials} />
        )}
      </div>
    </section>
  );
}
