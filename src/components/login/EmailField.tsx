import { useTranslations } from "next-intl";
import type { ReactElement } from "react";
import { HelperChunks } from "@/components/login/HelperChunks";
import { get_email_parts } from "@/lib/validation/credentials";

interface EmailFieldProps {
  id: string;
  value: string;
  was_edited: boolean;
  is_valid: boolean;
  border_mark: "error" | "valid" | undefined;
  on_change: (value: string) => void;
  on_blur: () => void;
}

/** Email input with the live "Example: name@domain.com" helper (it doubles as the field's guidance). */
export function EmailField({
  id,
  value,
  was_edited,
  is_valid,
  border_mark,
  on_change,
  on_blur,
}: EmailFieldProps): ReactElement {
  const t = useTranslations("auth");
  const helper_id = `${id}-helper`;
  const part_texts = {
    name: t("emailExample.name"),
    at: "@",
    domain: t("emailExample.domain"),
    dot: ".",
    tld: t("emailExample.tld"),
  };
  const chunks = get_email_parts(value).map((part) => ({ id: part.id, text: part_texts[part.id], is_met: part.is_met }));

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
        aria-invalid={was_edited && !is_valid}
        aria-describedby={helper_id}
        data-mark={border_mark}
        data-valid={is_valid}
        onChange={(event) => on_change(event.target.value)}
        onBlur={on_blur}
      />
      <HelperChunks id={helper_id} label={t("emailExample.label")} chunks={chunks} separator="" was_edited={was_edited} />
    </div>
  );
}
