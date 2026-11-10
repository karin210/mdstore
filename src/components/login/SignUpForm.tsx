"use client";

import { useTranslations } from "next-intl";
import { useReducer, useState, type FormEvent, type ReactElement } from "react";
import { FormAlert } from "@/components/global/FormAlert";
import { SubmitButton } from "@/components/global/SubmitButton";
import { EmailField } from "@/components/login/EmailField";
import { PasswordField } from "@/components/login/PasswordField";
import { SignUpForm as SignUpFormModel, type CredentialValues } from "@/lib/forms/credentialForms";
import { generate_suggested_password, type CredentialField } from "@/lib/validation/credentials";
import styles from "./CredentialsForm.module.css";

/** Prefix of the field ids; the first wrong field is focused by id on submit. */
const FORM_ID = "sign-up";

interface SignUpFormProps {
  is_submitting: boolean;
  error_message: string;
  on_submit: (values: CredentialValues) => void;
}

/** Owns the sign-up fields, their validation and guidance; emits the values on a valid submit. */
export function SignUpForm({ is_submitting, error_message, on_submit }: SignUpFormProps): ReactElement {
  const t = useTranslations("auth");
  const [form] = useState(() => new SignUpFormModel());
  const [, rerender] = useReducer((count: number) => count + 1, 0);

  function update_field(field: CredentialField, value: string): void {
    form.set_value(field, value);
    rerender();
  }

  function leave_field(field: CredentialField): void {
    form.mark_left(field);
    rerender();
  }

  function use_suggested_password(): void {
    form.set_value("password", generate_suggested_password());
    form.mark_left("password");
    rerender();
  }

  function submit_sign_up(event: FormEvent<HTMLFormElement>): void {
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
    <form className={styles.form} noValidate onSubmit={submit_sign_up}>
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
        mode="signUp"
        value={form.get_value("password")}
        was_edited={form.was_edited("password")}
        is_valid={form.is_field_valid("password")}
        border_mark={form.get_border_mark("password")}
        guidance_key={null}
        on_change={(value) => update_field("password", value)}
        on_blur={() => leave_field("password")}
        on_suggest={use_suggested_password}
      />
      {error_message && <FormAlert tone="error">{error_message}</FormAlert>}
      <div className={styles.actions}>
        <SubmitButton label={t("submit.signUp")} busy_label={t("submit.busy")} is_busy={is_submitting} />
      </div>
    </form>
  );
}
