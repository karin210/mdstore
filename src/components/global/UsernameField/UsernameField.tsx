import { useTranslations } from "next-intl";
import type { ReactElement } from "react";
import type { UsernameGuidanceKey } from "@/lib/validation/username";
import styles from "./UsernameField.module.css";

interface UsernameFieldProps {
  id: string;
  value: string;
  /** What's wrong with the value (client check), or "usernameTaken" from the server. */
  guidanceKey: UsernameGuidanceKey | "usernameTaken" | null;
  borderMark: "error" | "valid" | undefined;
  isValid: boolean;
  onChange: (value: string) => void;
  onBlur: () => void;
}

/** The @username input of the sign-up and "pick your username" forms; the @ is shown, not typed. */
export function UsernameField({
  id,
  value,
  guidanceKey,
  borderMark,
  isValid,
  onChange,
  onBlur,
}: UsernameFieldProps): ReactElement {
  const t = useTranslations("auth");
  const hint_id = `${id}-hint`;
  const guidance_id = `${id}-guidance`;
  const guidance_text = guidanceKey ? t(`guidance.${guidanceKey}`) : "";

  return (
    <div className="form-field">
      <label htmlFor={id} className="form-label">
        {t("fields.username")}
      </label>
      <div className={styles.control}>
        <span className={styles.at} aria-hidden="true">
          @
        </span>
        <input
          id={id}
          name="username"
          type="text"
          autoComplete="nickname"
          autoCapitalize="none"
          spellCheck={false}
          maxLength={40}
          className="form-input"
          value={value}
          aria-invalid={guidanceKey !== null}
          aria-describedby={`${hint_id} ${guidance_id}`}
          data-mark={borderMark}
          data-valid={isValid}
          onChange={(event) => onChange(event.target.value)}
          onBlur={onBlur}
        />
      </div>
      <p id={hint_id} className="form-hint">
        {t("usernameHint")}
      </p>
      <p id={guidance_id} className="form-guidance" aria-live="polite" hidden={guidance_text === ""}>
        {guidance_text}
      </p>
    </div>
  );
}
