import { useTranslations } from "next-intl";
import type { ReactElement } from "react";
import { HelperChunks } from "@/components/login/HelperChunks";
import { getEmailParts } from "@/lib/validation/credentials";

interface EmailFieldProps {
  id: string;
  value: string;
  wasEdited: boolean;
  isValid: boolean;
  borderMark: "error" | "valid" | undefined;
  onChange: (value: string) => void;
  onBlur: () => void;
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
    <div className="form-field">
      <label htmlFor={id} className="form-label">
        {t("fields.email")}
      </label>
      <input
        id={id}
        name="email"
        type="email"
        inputMode="email"
        autoComplete="username"
        spellCheck={false}
        className="form-input"
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
