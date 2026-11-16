"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useReducer, useState, useTransition, type FormEvent, type ReactElement } from "react";
import { FormAlert } from "@/components/global/FormAlert";
import { SubmitButton } from "@/components/global/SubmitButton";
import { UsernameField } from "@/components/global/UsernameField";
import { UsernameForm } from "@/lib/forms/credentialForms";
import { set_username, type SetUsernameResult } from "@/server/profiles/actions";
import styles from "./PickUsernameForm.module.css";

const FIELD_ID = "pick-username";

/**
 * Asks a signed-in account without a username (created before usernames existed) to pick one.
 * On success the page re-renders on the server, which then shows what needed the username.
 */
export function PickUsernameForm(): ReactElement {
  const t = useTranslations("auth.pickUsername");
  const router = useRouter();
  const [form] = useState(() => new UsernameForm());
  const [, rerender] = useReducer((count: number) => count + 1, 0);
  const [is_taken, set_is_taken] = useState(false);
  const [error_message, set_error_message] = useState("");
  const [is_saving, start_saving] = useTransition();

  function show_result(result: SetUsernameResult): void {
    if (result.status === "saved") {
      router.refresh();
      return;
    }
    if (result.status === "invalid") {
      if (result.guidance_key === "usernameTaken") set_is_taken(true);
      document.getElementById(FIELD_ID)?.focus();
      return;
    }
    set_error_message(t(`errors.${result.error_key}`, { requestId: result.request_id ?? "" }));
  }

  function submit_username(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    form.markAllEdited();
    set_error_message("");
    rerender();
    if (!form.isValid) {
      document.getElementById(FIELD_ID)?.focus();
      return;
    }
    start_saving(async () => show_result(await set_username(form.getValue("username"))));
  }

  return (
    <form className={styles.form} noValidate onSubmit={submit_username} aria-labelledby="pick-username-title">
      <header className={styles.heading}>
        <h3 id="pick-username-title" className={styles.title}>
          {t("title")}
        </h3>
        <p className={styles.lead}>{t("lead")}</p>
      </header>
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
      {error_message && <FormAlert tone="error">{error_message}</FormAlert>}
      <div>
        <SubmitButton label={t("submit")} busyLabel={t("busy")} isBusy={is_saving} />
      </div>
    </form>
  );
}
