"use client";

import { useTranslations } from "next-intl";
import { useReducer, useState, type FormEvent, type ReactElement } from "react";
import { FormAlert } from "@/components/global/FormAlert";
import { SubmitButton } from "@/components/global/SubmitButton";
import { EmailField } from "@/components/login/EmailField";
import { PasswordField } from "@/components/login/PasswordField";
import { SignUpForm as SignUpFormModel, type CredentialValues } from "@/lib/forms/credentialForms";
import { generateSuggestedPassword, type CredentialField } from "@/lib/validation/credentials";
import styles from "./CredentialsForm.module.css";

/** Prefix of the field ids; the first wrong field is focused by id on submit. */
const FORM_ID = "sign-up";

interface SignUpFormProps {
  isSubmitting: boolean;
  errorMessage: string;
  onSubmit: (values: CredentialValues) => void;
}

/** Owns the sign-up fields, their validation and guidance; emits the values on a valid submit. */
export function SignUpForm({ isSubmitting, errorMessage, onSubmit }: SignUpFormProps): ReactElement {
  const t = useTranslations("auth");
  const [form] = useState(() => new SignUpFormModel());
  const [, rerender] = useReducer((count: number) => count + 1, 0);

  function updateField(field: CredentialField, value: string): void {
    form.setValue(field, value);
    rerender();
  }

  function leaveField(field: CredentialField): void {
    form.markLeft(field);
    rerender();
  }

  function applySuggestedPassword(): void {
    form.setValue("password", generateSuggestedPassword());
    form.markLeft("password");
    rerender();
  }

  function submitSignUp(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    form.markAllEdited();
    rerender();
    const invalidField = form.firstInvalidField;
    if (invalidField) {
      document.getElementById(`${FORM_ID}-${invalidField}`)?.focus();
      return;
    }
    onSubmit(form.getValues());
  }

  return (
    <form className={styles.form} noValidate onSubmit={submitSignUp}>
      <EmailField
        id={`${FORM_ID}-email`}
        value={form.getValue("email")}
        wasEdited={form.wasEdited("email")}
        isValid={form.isFieldValid("email")}
        borderMark={form.getBorderMark("email")}
        onChange={(value) => updateField("email", value)}
        onBlur={() => leaveField("email")}
      />
      <PasswordField
        id={`${FORM_ID}-password`}
        mode="signUp"
        value={form.getValue("password")}
        wasEdited={form.wasEdited("password")}
        isValid={form.isFieldValid("password")}
        borderMark={form.getBorderMark("password")}
        guidanceKey={null}
        onChange={(value) => updateField("password", value)}
        onBlur={() => leaveField("password")}
        onSuggest={applySuggestedPassword}
      />
      {errorMessage && <FormAlert tone="error">{errorMessage}</FormAlert>}
      <div className={styles.actions}>
        <SubmitButton label={t("submit.signUp")} busyLabel={t("submit.busy")} isBusy={isSubmitting} />
      </div>
    </form>
  );
}
