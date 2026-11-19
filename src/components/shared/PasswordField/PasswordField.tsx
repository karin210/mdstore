"use client";

import { useTranslations } from "next-intl";
import { useEffect, useRef, useState, type ReactElement } from "react";
import { CopyIcon, EyeIcon, EyeOffIcon } from "@/components/shared/icons/icons";
import { HelperChunks } from "@/components/shared/HelperChunks/HelperChunks";
import {
  getSignUpPasswordRules,
  SIGN_UP_PASSWORD_RULES_ATTRIBUTE,
  type SignInPasswordGuidanceKey,
} from "@/lib/validation/credentials";
import form_styles from "@/styles/form.module.css";
import styles from "./PasswordField.module.css";

interface PasswordFieldProps {
  id: string;
  /** Sign-up shows the rules helper, the copy control and the suggested-password button. */
  mode: "signIn" | "signUp";
  value: string;
  wasEdited: boolean;
  isValid: boolean;
  borderMark: "error" | "valid" | undefined;
  /**
   * What is wrong with the value: sign-in rules, or (on /profile) a wrong current password or a new
   * one equal to it. The sign-up rules show in the rules helper instead.
   */
  guidanceKey: SignInPasswordGuidanceKey | "currentPasswordWrong" | "passwordUnchanged" | null;
  /** Visible label; "Password" by default (the profile asks for the current and the new one). */
  label?: string;
  onChange: (value: string) => void;
  onBlur: () => void;
  onSuggest?: () => void;
}

export function PasswordField({
  id,
  mode,
  value,
  wasEdited,
  isValid,
  borderMark,
  guidanceKey,
  label,
  onChange,
  onBlur,
  onSuggest,
}: PasswordFieldProps): ReactElement {
  const t = useTranslations("auth");
  const [isVisible, setIsVisible] = useState(false);
  const [copyMessage, setCopyMessage] = useState("");
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const helperId = `${id}-helper`;
  const guidanceId = `${id}-guidance`;
  const isSignUp = mode === "signUp";
  const showsToggle = value !== "";
  const showsCopy = isSignUp && isValid;
  const guidanceText = guidanceKey ? t(`guidance.${guidanceKey}`) : "";
  const describedBy = isSignUp ? `${helperId} ${guidanceId}` : guidanceId;

  useEffect(
    () => () => {
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    },
    [],
  );

  async function copyPassword(): Promise<void> {
    try {
      await navigator.clipboard.writeText(value);
      setCopyMessage(t("password.copied"));
    } catch {
      setCopyMessage(t("password.copyFailed"));
    }
    if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    copyTimerRef.current = setTimeout(() => setCopyMessage(""), 3000);
  }

  const ruleTexts = {
    length: t("passwordRules.length"),
    lower: t("passwordRules.lower"),
    upper: t("passwordRules.upper"),
    digit: t("passwordRules.digit"),
  };
  const ruleChunks = getSignUpPasswordRules(value).map((rule) => ({
    id: rule.id,
    text: ruleTexts[rule.id],
    isMet: rule.isMet,
  }));

  return (
    <div className={form_styles.field}>
      <label htmlFor={id} className={form_styles.label}>
        {label ?? t("fields.password")}
      </label>
      <div className={styles.control}>
        <input
          id={id}
          name="password"
          type={isVisible ? "text" : "password"}
          autoComplete={isSignUp ? "new-password" : "current-password"}
          // Safari's generator reads this to suggest a password the sign-up rule accepts.
          {...(isSignUp ? { passwordrules: SIGN_UP_PASSWORD_RULES_ATTRIBUTE } : {})}
          spellCheck={false}
          className={`${form_styles.input} ${styles.input}`}
          value={value}
          aria-invalid={wasEdited && !isValid}
          aria-describedby={describedBy}
          data-mark={borderMark}
          data-valid={isValid}
          onChange={(event) => onChange(event.target.value)}
          onBlur={onBlur}
        />
        <div className={styles.controls}>
          {isSignUp && (
            <button
              type="button"
              className={styles.iconButton}
              data-visible={showsCopy}
              inert={!showsCopy}
              aria-label={t("password.copy")}
              title={t("password.copy")}
              onClick={copyPassword}
            >
              <CopyIcon />
            </button>
          )}
          <button
            type="button"
            className={styles.iconButton}
            data-visible={showsToggle}
            inert={!showsToggle}
            aria-pressed={isVisible}
            aria-label={isVisible ? t("password.hide") : t("password.show")}
            title={isVisible ? t("password.hide") : t("password.show")}
            onClick={() => setIsVisible((visible) => !visible)}
          >
            {isVisible ? <EyeOffIcon /> : <EyeIcon />}
          </button>
        </div>
      </div>
      <div className={styles.below}>
        {isSignUp && (
          <HelperChunks
            id={helperId}
            label={t("passwordRules.label")}
            chunks={ruleChunks}
            separator=", "
            wasEdited={wasEdited}
          />
        )}
        <p id={guidanceId} className={form_styles.guidance} aria-live="polite" hidden={guidanceText === ""}>
          {guidanceText}
        </p>
        <p className={form_styles.hint} role="status" hidden={copyMessage === ""}>
          {copyMessage}
        </p>
        {isSignUp && onSuggest && (
          <div className={styles.suggestRow}>
            <button type="button" className={styles.suggest} onClick={onSuggest}>
              {t("password.suggest")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
