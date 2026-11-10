"use client";

import { useTranslations } from "next-intl";
import { useEffect, useRef, useState, type ReactElement } from "react";
import { CopyIcon, EyeIcon, EyeOffIcon } from "@/components/global/icons";
import { HelperChunks } from "@/components/login/HelperChunks";
import {
  get_sign_up_password_rules,
  SIGN_UP_PASSWORD_RULES_ATTRIBUTE,
  type SignInPasswordGuidanceKey,
} from "@/lib/validation/credentials";
import styles from "./PasswordField.module.css";

interface PasswordFieldProps {
  id: string;
  /** Sign-up shows the rules helper, the copy control and the suggested-password button. */
  mode: "signIn" | "signUp";
  value: string;
  was_edited: boolean;
  is_valid: boolean;
  border_mark: "error" | "valid" | undefined;
  /** Sign-in only: what is wrong with the value (sign-up uses the rules helper instead). */
  guidance_key: SignInPasswordGuidanceKey | null;
  on_change: (value: string) => void;
  on_blur: () => void;
  on_suggest?: () => void;
}

export function PasswordField({
  id,
  mode,
  value,
  was_edited,
  is_valid,
  border_mark,
  guidance_key,
  on_change,
  on_blur,
  on_suggest,
}: PasswordFieldProps): ReactElement {
  const t = useTranslations("auth");
  const [is_visible, set_is_visible] = useState(false);
  const [copy_message, set_copy_message] = useState("");
  const copy_timer_ref = useRef<ReturnType<typeof setTimeout> | null>(null);
  const helper_id = `${id}-helper`;
  const guidance_id = `${id}-guidance`;
  const is_sign_up = mode === "signUp";
  const shows_toggle = value !== "";
  const shows_copy = is_sign_up && is_valid;
  const guidance_text = guidance_key ? t(`guidance.${guidance_key}`) : "";
  const described_by = is_sign_up ? `${helper_id} ${guidance_id}` : guidance_id;

  useEffect(() => () => {
    if (copy_timer_ref.current) clearTimeout(copy_timer_ref.current);
  }, []);

  async function copy_password(): Promise<void> {
    try {
      await navigator.clipboard.writeText(value);
      set_copy_message(t("password.copied"));
    } catch {
      set_copy_message(t("password.copyFailed"));
    }
    if (copy_timer_ref.current) clearTimeout(copy_timer_ref.current);
    copy_timer_ref.current = setTimeout(() => set_copy_message(""), 3000);
  }

  const rule_texts = {
    length: t("passwordRules.length"),
    lower: t("passwordRules.lower"),
    upper: t("passwordRules.upper"),
    digit: t("passwordRules.digit"),
  };
  const rule_chunks = get_sign_up_password_rules(value).map((rule) => ({
    id: rule.id,
    text: rule_texts[rule.id],
    is_met: rule.is_met,
  }));

  return (
    <div className="form-field">
      <label htmlFor={id} className="form-label">
        {t("fields.password")}
      </label>
      <div className={styles.control}>
        <input
          id={id}
          name="password"
          type={is_visible ? "text" : "password"}
          autoComplete={is_sign_up ? "new-password" : "current-password"}
          // Safari's generator reads this to suggest a password the sign-up rule accepts.
          {...(is_sign_up ? { passwordrules: SIGN_UP_PASSWORD_RULES_ATTRIBUTE } : {})}
          spellCheck={false}
          className={`form-input ${styles.input}`}
          value={value}
          aria-invalid={was_edited && !is_valid}
          aria-describedby={described_by}
          data-mark={border_mark}
          data-valid={is_valid}
          onChange={(event) => on_change(event.target.value)}
          onBlur={on_blur}
        />
        <div className={styles.controls}>
          {is_sign_up && (
            <button
              type="button"
              className={styles.iconButton}
              data-visible={shows_copy}
              inert={!shows_copy}
              aria-label={t("password.copy")}
              title={t("password.copy")}
              onClick={copy_password}
            >
              <CopyIcon />
            </button>
          )}
          <button
            type="button"
            className={styles.iconButton}
            data-visible={shows_toggle}
            inert={!shows_toggle}
            aria-pressed={is_visible}
            aria-label={is_visible ? t("password.hide") : t("password.show")}
            title={is_visible ? t("password.hide") : t("password.show")}
            onClick={() => set_is_visible((visible) => !visible)}
          >
            {is_visible ? <EyeOffIcon /> : <EyeIcon />}
          </button>
        </div>
      </div>
      <div className={styles.below}>
        {is_sign_up && (
          <HelperChunks
            id={helper_id}
            label={t("passwordRules.label")}
            chunks={rule_chunks}
            separator=", "
            was_edited={was_edited}
          />
        )}
        <p id={guidance_id} className="form-guidance" aria-live="polite" hidden={guidance_text === ""}>
          {guidance_text}
        </p>
        <p className="form-hint" role="status" hidden={copy_message === ""}>
          {copy_message}
        </p>
        {is_sign_up && on_suggest && (
          <div className={styles.suggestRow}>
            <button type="button" className={styles.suggest} onClick={on_suggest}>
              {t("password.suggest")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
