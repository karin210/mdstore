"use client";

import { useLocale, useTranslations } from "next-intl";
import { useReducer, useState, useTransition, type FormEvent, type ReactElement } from "react";
import { EmailField } from "@/components/shared/EmailField/EmailField";
import { FormAlert } from "@/components/shared/FormAlert/FormAlert";
import { SubmitButton } from "@/components/shared/SubmitButton/SubmitButton";
import { EmailChangeForm } from "@/lib/forms/credentialForms";
import { change_email, type ChangeEmailResult } from "@/server/profiles/actions";
import styles from "./ChangeEmailForm.module.css";

const FIELD_ID = "change-email";

/**
 * Asks for a new email. Nothing changes until the user opens the confirmation link, so the result
 * is a "check your inbox" message rather than a saved value.
 */
export function ChangeEmailForm(): ReactElement {
  const t = useTranslations("account.profile");
  const locale = useLocale();
  const [form] = useState(() => new EmailChangeForm());
  const [, rerender] = useReducer((count: number) => count + 1, 0);
  const [alert, set_alert] = useState<{ tone: "error" | "success"; text: string } | null>(null);
  const [is_sending, start_sending] = useTransition();

  function show_result(result: ChangeEmailResult): void {
    if (result.status === "checkEmail") {
      set_alert({ tone: "success", text: t("email.checkEmail", { email: result.email }) });
      form.reset();
      rerender();
      return;
    }
    if (result.status === "invalid") {
      document.getElementById(FIELD_ID)?.focus();
      return;
    }
    const text =
      result.error_key === "sameEmail" || result.error_key === "emailTaken"
        ? t(`email.errors.${result.error_key}`)
        : t(`errors.${result.error_key}`, { requestId: result.request_id ?? "" });
    set_alert({ tone: "error", text });
  }

  function submit_email(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    form.markAllEdited();
    set_alert(null);
    rerender();
    if (!form.isValid) {
      document.getElementById(FIELD_ID)?.focus();
      return;
    }
    start_sending(async () => show_result(await change_email(form.getValue("email"), locale)));
  }

  return (
    <form className={styles.form} noValidate onSubmit={submit_email}>
      <EmailField
        id={FIELD_ID}
        label={t("email.field")}
        auto_complete="email"
        value={form.getValue("email")}
        wasEdited={form.wasEdited("email")}
        isValid={form.isFieldValid("email")}
        borderMark={form.getBorderMark("email")}
        onChange={(value) => {
          form.setValue("email", value);
          rerender();
        }}
        onBlur={() => {
          form.markLeft("email");
          rerender();
        }}
      />
      {alert && <FormAlert tone={alert.tone}>{alert.text}</FormAlert>}
      <div>
        <SubmitButton label={t("email.submit")} busyLabel={t("email.busy")} isBusy={is_sending} />
      </div>
    </form>
  );
}
