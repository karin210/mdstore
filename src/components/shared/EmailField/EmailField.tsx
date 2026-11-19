import { useTranslations } from "next-intl";
import type { ReactElement } from "react";
import { HelperChunks } from "@/components/shared/HelperChunks/HelperChunks";
import { getEmailParts } from "@/lib/validation/credentials";
import form_styles from "@/styles/form.module.css";

interface EmailFieldProps {
  id: string;
  value: string;
  wasEdited: boolean;
  isValid: boolean;
  borderMark: "error" | "valid" | undefined;
  onChange: (value: string) => void;
  onBlur: () => void;
  /** Visible label; "Email" by default ("New email" on /profile). */
  label?: string;
  /** "username" for signing in (the account's email), "email" for a new address. */
  auto_complete?: "username" | "email";
}

/** Email input with the live "Example: name@domain.com" helper (it doubles as the field's guidance). */
export function EmailField({
  id,
  value,
  wasEdited,
  isValid,
  borderMark,
  onChange,
  onBlur,
  label,
  auto_complete = "username",
}: EmailFieldProps): ReactElement {
  const t = useTranslations("auth");
  const helperId = `${id}-helper`;
  const partTexts = {
    name: t("emailExample.name"),
    at: "@",
    domain: t("emailExample.domain"),
    dot: ".",
    tld: t("emailExample.tld"),
  };
  const chunks = getEmailParts(value).map((part) => ({
    id: part.id,
    text: partTexts[part.id],
    isMet: part.isMet,
  }));

  return (
    <div className={form_styles.field}>
      <label htmlFor={id} className={form_styles.label}>
        {label ?? t("fields.email")}
      </label>
      <input
        id={id}
        name="email"
        type="email"
        inputMode="email"
        autoComplete={auto_complete}
        spellCheck={false}
        className={form_styles.input}
        value={value}
        aria-invalid={wasEdited && !isValid}
        aria-describedby={helperId}
        data-mark={borderMark}
        data-valid={isValid}
        onChange={(event) => onChange(event.target.value)}
        onBlur={onBlur}
      />
      <HelperChunks id={helperId} label={t("emailExample.label")} chunks={chunks} separator="" wasEdited={wasEdited} />
    </div>
  );
}
