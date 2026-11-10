"use client";

import { useTranslations } from "next-intl";
import { useReducer, useState, type FormEvent, type ReactElement } from "react";
import { FormAlert } from "@/components/global/FormAlert";
import { SubmitButton } from "@/components/global/SubmitButton";
import { EmailField } from "@/components/login/EmailField";
import { PasswordField } from "@/components/login/PasswordField";
import { SignInForm as SignInFormModel, type CredentialValues } from "@/lib/forms/credentialForms";
import type { CredentialField, SignInPasswordGuidanceKey } from "@/lib/validation/credentials";
import styles from "./CredentialsForm.module.css";

/** Prefix of the field ids; the first wrong field is focused by id on submit. */
const FORM_ID = "sign-in";

interface SignInFormProps {
  is_submitting: boolean;
  error_message: string;
  on_submit: (values: CredentialValues) => void;
}

/** Owns the sign-in fields, their validation and guidance; emits the values on a valid submit. */
export function SignInForm({ is_submitting, error_message, on_submit }: SignInFormProps): ReactElement {
  const t = useTranslations("auth");
  const [form] = useState(() => new SignInFormModel());
  const [, rerender] = useReducer((count: number) => count + 1, 0);

  function update_field(field: CredentialField, value: string): void {
    form.set_value(field, value);
    rerender();
  }

  function leave_field(field: CredentialField): void {
    form.mark_left(field);
    rerender();
  }

  function submit_sign_in(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    form.mark_all_edited();
    rerender();
    const invalid_field = form.first_invalid_field;
    if (invalid_field) {
      document.getElementById(`${FORM_ID}-${invalid_field}`)?.focus();
      return;
    }
    on_submit(form.get_values());
  }

  return (
    <form className={styles.form} noValidate onSubmit={submit_sign_in}>
      <EmailField
        id={`${FORM_ID}-email`}
        value={form.get_value("email")}
        was_edited={form.was_edited("email")}
        is_valid={form.is_field_valid("email")}
        border_mark={form.get_border_mark("email")}
        on_change={(value) => update_field("email", value)}
        on_blur={() => leave_field("email")}
      />
      <PasswordField
        id={`${FORM_ID}-password`}
        mode="signIn"
        value={form.get_value("password")}
        was_edited={form.was_edited("password")}
        is_valid={form.is_field_valid("password")}
        border_mark={form.get_border_mark("password")}
        // The sign-in password rule only produces sign-in keys (see get_sign_in_password_guidance).
        guidance_key={form.get_guidance("password") as SignInPasswordGuidanceKey | null}
        on_change={(value) => update_field("password", value)}
        on_blur={() => leave_field("password")}
      />
      {error_message && <FormAlert tone="error">{error_message}</FormAlert>}
      <div className={styles.actions}>
        <SubmitButton label={t("submit.signIn")} busy_label={t("submit.busy")} is_busy={is_submitting} />
      </div>
    </form>
  );
}
