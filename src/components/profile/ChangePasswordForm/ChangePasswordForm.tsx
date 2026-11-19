"use client";

import { useTranslations } from "next-intl";
import { useReducer, useState, useTransition, type FormEvent, type ReactElement } from "react";
import { FormAlert } from "@/components/shared/FormAlert/FormAlert";
import { PasswordField } from "@/components/shared/PasswordField/PasswordField";
import { SubmitButton } from "@/components/shared/SubmitButton/SubmitButton";
import { PasswordChangeForm } from "@/lib/forms/credentialForms";
import type { ChangePasswordField } from "@/lib/validation/accountChanges";
import { generateSuggestedPassword, type SignInPasswordGuidanceKey } from "@/lib/validation/credentials";
import { change_password, type ChangePasswordResult } from "@/server/profiles/actions";
import styles from "./ChangePasswordForm.module.css";

/** Prefix of the field ids; the first wrong field is focused by id on submit. */
const FORM_ID = "change-password";

type ServerIssue =
  { field: "current_password"; key: "currentPasswordWrong" } | { field: "new_password"; key: "passwordUnchanged" };

/** Changes the password: the current one first (checked on the server), then a new one that follows the sign-up rules. */
export function ChangePasswordForm(): ReactElement {
  const t = useTranslations("account.profile");
  const [form] = useState(() => new PasswordChangeForm());
  const [, rerender] = useReducer((count: number) => count + 1, 0);
  const [server_issue, set_server_issue] = useState<ServerIssue | null>(null);
  const [alert, set_alert] = useState<{ tone: "error" | "success"; text: string } | null>(null);
  const [is_saving, start_saving] = useTransition();

  function focus_field(field: ChangePasswordField): void {
    document.getElementById(`${FORM_ID}-${field}`)?.focus();
  }

  function update_field(field: ChangePasswordField, value: string): void {
    form.setValue(field, value);
    set_server_issue(null);
    rerender();
  }

  function show_result(result: ChangePasswordResult): void {
    if (result.status === "saved") {
      form.reset();
      set_alert({ tone: "success", text: t("password.saved") });
      rerender();
      return;
    }
    if (result.status === "invalid") {
      if (result.guidance_key === "currentPasswordWrong") {
        set_server_issue({ field: "current_password", key: "currentPasswordWrong" });
      } else if (result.guidance_key === "passwordUnchanged") {
        set_server_issue({ field: "new_password", key: "passwordUnchanged" });
      }
      focus_field(result.field);
      return;
    }
    set_alert({ tone: "error", text: t(`errors.${result.error_key}`, { requestId: result.request_id ?? "" }) });
  }

  function submit_password(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    form.markAllEdited();
    set_alert(null);
    rerender();
    const invalid_field = form.firstInvalidField;
    if (invalid_field) {
      focus_field(invalid_field);
      return;
    }
    const { current_password, new_password } = form.getValues();
    start_saving(async () => show_result(await change_password(current_password, new_password)));
  }

  const current_guidance =
    server_issue?.field === "current_password"
      ? server_issue.key
      : (form.getGuidance("current_password") as SignInPasswordGuidanceKey | null);
  // The new password's rules show in its helper line; only "same as the current one" needs a message.
  const new_guidance =
    server_issue?.field === "new_password" || form.getGuidance("new_password") === "passwordUnchanged"
      ? "passwordUnchanged"
      : null;

  return (
    <form className={styles.form} noValidate onSubmit={submit_password}>
      <PasswordField
        id={`${FORM_ID}-current_password`}
        mode="signIn"
        label={t("password.current")}
        value={form.getValue("current_password")}
        wasEdited={form.wasEdited("current_password")}
        isValid={form.isFieldValid("current_password") && server_issue?.field !== "current_password"}
        borderMark={server_issue?.field === "current_password" ? "error" : form.getBorderMark("current_password")}
        guidanceKey={current_guidance}
        onChange={(value) => update_field("current_password", value)}
        onBlur={() => {
          form.markLeft("current_password");
          rerender();
        }}
      />
      <PasswordField
        id={`${FORM_ID}-new_password`}
        mode="signUp"
        label={t("password.new")}
        value={form.getValue("new_password")}
        wasEdited={form.wasEdited("new_password")}
        isValid={form.isFieldValid("new_password") && server_issue?.field !== "new_password"}
        borderMark={server_issue?.field === "new_password" ? "error" : form.getBorderMark("new_password")}
        guidanceKey={new_guidance}
        onChange={(value) => update_field("new_password", value)}
        onBlur={() => {
          form.markLeft("new_password");
          rerender();
        }}
        onSuggest={() => {
          update_field("new_password", generateSuggestedPassword());
          form.markLeft("new_password");
          rerender();
        }}
      />
      {alert && <FormAlert tone={alert.tone}>{alert.text}</FormAlert>}
      <div>
        <SubmitButton label={t("password.submit")} busyLabel={t("password.busy")} isBusy={is_saving} />
      </div>
    </form>
  );
}
