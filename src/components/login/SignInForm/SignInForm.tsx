"use client";

import { useTranslations } from "next-intl";
import { useReducer, useState, type FormEvent, type ReactElement } from "react";
import { FormAlert } from "@/components/shared/FormAlert/FormAlert";
import { SubmitButton } from "@/components/shared/SubmitButton/SubmitButton";
import { EmailField } from "@/components/shared/EmailField/EmailField";
import { PasswordField } from "@/components/shared/PasswordField/PasswordField";
import { SignInForm as SignInFormModel, type CredentialValues } from "@/lib/forms/credentialForms";
import type { CredentialField, SignInPasswordGuidanceKey } from "@/lib/validation/credentials";
import styles from "@/components/login/shared/CredentialsForm.module.css";

/** Prefix of the field ids; the first wrong field is focused by id on submit. */
const FORM_ID = "sign-in";

interface SignInFormProps {
  isSubmitting: boolean;
  errorMessage: string;
  onSubmit: (values: CredentialValues) => void;
}

/** Owns the sign-in fields, their validation and guidance; emits the values on a valid submit. */
export function SignInForm({ isSubmitting, errorMessage, onSubmit }: SignInFormProps): ReactElement {
  const t = useTranslations("auth");
  const [form] = useState(() => new SignInFormModel());
  const [, rerender] = useReducer((count: number) => count + 1, 0);

  function updateField(field: CredentialField, value: string): void {
    form.setValue(field, value);
    rerender();
  }

  function leaveField(field: CredentialField): void {
    form.markLeft(field);
    rerender();
  }

  function submitSignIn(event: FormEvent<HTMLFormElement>): void {
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
    <form className={styles.form} noValidate onSubmit={submitSignIn}>
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
        mode="signIn"
        value={form.getValue("password")}
        wasEdited={form.wasEdited("password")}
        isValid={form.isFieldValid("password")}
        borderMark={form.getBorderMark("password")}
        // The sign-in password rule only produces sign-in keys (see getSignInPasswordGuidance).
        guidanceKey={form.getGuidance("password") as SignInPasswordGuidanceKey | null}
        onChange={(value) => updateField("password", value)}
        onBlur={() => leaveField("password")}
      />
      {errorMessage && <FormAlert tone="error">{errorMessage}</FormAlert>}
      <div className={styles.actions}>
        <SubmitButton label={t("submit.signIn")} busyLabel={t("submit.busy")} isBusy={isSubmitting} />
      </div>
    </form>
  );
}
