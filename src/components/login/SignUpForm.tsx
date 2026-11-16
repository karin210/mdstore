"use client";

import { useTranslations } from "next-intl";
import { useReducer, useState, type FormEvent, type ReactElement } from "react";
import { FormAlert } from "@/components/global/FormAlert";
import { SubmitButton } from "@/components/global/SubmitButton";
import { UsernameField } from "@/components/global/UsernameField";
import { EmailField } from "@/components/login/EmailField";
import { PasswordField } from "@/components/login/PasswordField";
import { SignUpForm as SignUpFormModel, type SignUpValues } from "@/lib/forms/credentialForms";
import { generateSuggestedPassword, type SignUpField } from "@/lib/validation/credentials";
import type { UsernameGuidanceKey } from "@/lib/validation/username";
import styles from "./CredentialsForm.module.css";

/** Prefix of the field ids; the first wrong field is focused by id on submit. */
const FORM_ID = "sign-up";

interface SignUpFormProps {
  isSubmitting: boolean;
  errorMessage: string;
  /** Set when the server found the username taken; cleared as soon as the user edits it. */
  isUsernameTaken: boolean;
  onUsernameEdited: () => void;
  onSubmit: (values: SignUpValues) => void;
}

/** Owns the sign-up fields, their validation and guidance; emits the values on a valid submit. */
export function SignUpForm({
  isSubmitting,
  errorMessage,
  isUsernameTaken,
  onUsernameEdited,
  onSubmit,
}: SignUpFormProps): ReactElement {
  const t = useTranslations("auth");
  const [form] = useState(() => new SignUpFormModel());
  const [, rerender] = useReducer((count: number) => count + 1, 0);

  function updateField(field: SignUpField, value: string): void {
    form.setValue(field, value);
    if (field === "username" && isUsernameTaken) onUsernameEdited();
    rerender();
  }

  function leaveField(field: SignUpField): void {
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

  const username_guidance = isUsernameTaken
    ? "usernameTaken"
    : (form.getGuidance("username") as UsernameGuidanceKey | null);

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
      <UsernameField
        id={`${FORM_ID}-username`}
        value={form.getValue("username")}
        guidanceKey={username_guidance}
        borderMark={isUsernameTaken ? "error" : form.getBorderMark("username")}
        isValid={form.isFieldValid("username") && !isUsernameTaken}
        onChange={(value) => updateField("username", value)}
        onBlur={() => leaveField("username")}
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
