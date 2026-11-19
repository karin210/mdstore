"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useReducer, useState, useTransition, type FormEvent, type ReactElement } from "react";
import { FormAlert } from "@/components/shared/FormAlert/FormAlert";
import { SubmitButton } from "@/components/shared/SubmitButton/SubmitButton";
import { UsernameField } from "@/components/shared/UsernameField/UsernameField";
import { UsernameForm } from "@/lib/forms/credentialForms";
import { change_username, type ChangeUsernameResult } from "@/server/profiles/actions";
import styles from "./ChangeUsernameForm.module.css";

const FIELD_ID = "change-username";

interface ChangeUsernameFormProps {
  current_username: string;
  /** When the 30-day cool-down ends, already formatted; null when the username can change now. */
  next_change_label: string | null;
}

/**
 * Renames the signed-in user's @username. The server re-checks everything (format, free name,
 * cool-down); on success the page re-renders so the details above show the new name.
 */
export function ChangeUsernameForm({ current_username, next_change_label }: ChangeUsernameFormProps): ReactElement {
  const t = useTranslations("account.profile");
  const router = useRouter();
  const [form] = useState(() => new UsernameForm(current_username));
  const [, rerender] = useReducer((count: number) => count + 1, 0);
  const [is_taken, set_is_taken] = useState(false);
  const [alert, set_alert] = useState<{ tone: "error" | "success"; text: string } | null>(null);
  const [is_saving, start_saving] = useTransition();

  function show_result(result: ChangeUsernameResult): void {
    if (result.status === "saved") {
      set_alert({ tone: "success", text: t("username.saved", { username: result.username }) });
      router.refresh();
      return;
    }
    if (result.status === "invalid") {
      if (result.guidance_key === "usernameTaken") set_is_taken(true);
      document.getElementById(FIELD_ID)?.focus();
      return;
    }
    const text =
      result.error_key === "tooSoon" || result.error_key === "usernameRequired"
        ? t(`username.errors.${result.error_key}`)
        : t(`errors.${result.error_key}`, { requestId: result.request_id ?? "" });
    set_alert({ tone: "error", text });
  }

  function submit_username(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    form.markAllEdited();
    set_alert(null);
    rerender();
    if (!form.isValid) {
      document.getElementById(FIELD_ID)?.focus();
      return;
    }
    start_saving(async () => show_result(await change_username(form.getValue("username"))));
  }

  return (
    <form className={styles.form} noValidate onSubmit={submit_username}>
      {next_change_label && <p className={styles.note}>{t("username.nextChange", { date: next_change_label })}</p>}
      <UsernameField
        id={FIELD_ID}
        value={form.getValue("username")}
        guidanceKey={is_taken ? "usernameTaken" : form.getGuidance("username")}
        borderMark={is_taken ? "error" : form.getBorderMark("username")}
        isValid={form.isFieldValid("username") && !is_taken}
        onChange={(value) => {
          form.setValue("username", value);
          set_is_taken(false);
          rerender();
        }}
        onBlur={() => {
          form.markLeft("username");
          rerender();
        }}
      />
      {alert && <FormAlert tone={alert.tone}>{alert.text}</FormAlert>}
      <div>
        <SubmitButton label={t("username.submit")} busyLabel={t("username.busy")} isBusy={is_saving} />
      </div>
    </form>
  );
}
