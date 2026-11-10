"use client";

import { useLocale, useTranslations } from "next-intl";
import { useReducer, useState, useTransition, type FormEvent, type ReactElement, type ReactNode } from "react";
import { FormAlert } from "@/components/global/FormAlert";
import { SubmitButton } from "@/components/global/SubmitButton";
import { getDescribedBy, PostFormField } from "@/components/upload/PostFormField";
import { promptCategories } from "@/data/prompts";
import { Link } from "@/i18n/navigation";
import { PromptPostForm, type PromptPostValues } from "@/lib/forms/PromptPostForm";
import {
  PREVIEW_LINES,
  PROMPT_POST_FIELDS,
  WORKS_WITH_TOOLS,
  type PromptPostField,
  type ValidationIssue,
} from "@/lib/validation/promptPost";
import { postPrompt, type PostPromptResult } from "@/server/prompts/actions";
import styles from "./PostPromptForm.module.css";

type TextField = Exclude<PromptPostField, "category" | "worksWith" | "file">;
type IssueMap = Partial<Record<PromptPostField, ValidationIssue>>;

interface PostPromptFormProps {
  /** The signed-in user's email, shown so they know which account posts. */
  email: string | null;
}

/** The id of a field's control, in kebab-case (`post-author-handle`); a checkbox group's first box is `${id}-0`. */
function getFieldId(field: PromptPostField): string {
  return `post-${field.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}`;
}

/** Moves focus to a field (the first box of a checkbox group) to lead the user to what needs a change. */
function focusField(field: PromptPostField): void {
  const id = field === "worksWith" ? `${getFieldId(field)}-0` : getFieldId(field);
  document.getElementById(id)?.focus();
}

/**
 * The upload form: the fields /prompts/[slug] shows, plus the .md file. It validates as the user
 * types (rules shared with the server), focuses the first wrong field on submit, and opens the
 * new prompt's page once it is posted.
 */
export function PostPromptForm({ email }: PostPromptFormProps): ReactElement {
  const t = useTranslations("upload.form");
  const tValidation = useTranslations("upload.validation");
  const tCategories = useTranslations("prompts.categories");
  const locale = useLocale();
  const [form] = useState(() => new PromptPostForm());
  const [, rerender] = useReducer((count: number) => count + 1, 0);
  const [serverIssues, setServerIssues] = useState<IssueMap>({});
  const [errorMessage, setErrorMessage] = useState<ReactNode>(null);
  const [isSubmitting, startSubmit] = useTransition();

  function getIssue(field: PromptPostField): ValidationIssue | null {
    return form.getGuidance(field) ?? serverIssues[field] ?? null;
  }

  function getGuidanceText(field: PromptPostField): string {
    const issue = getIssue(field);
    return issue ? tValidation(issue.key, issue.values ?? {}) : "";
  }

  /** The state attributes every control of a field carries (see "Forms" in globals.css). */
  function getControlState(field: PromptPostField): Record<string, string | boolean | undefined> {
    const hasServerIssue = Boolean(serverIssues[field]);
    return {
      "aria-invalid": getIssue(field) !== null,
      "data-mark": hasServerIssue ? "error" : form.getBorderMark(field),
      "data-valid": form.isFieldValid(field) && !hasServerIssue,
    };
  }

  function updateField<Field extends PromptPostField>(field: Field, value: PromptPostValues[Field]): void {
    form.setValue(field, value);
    if (serverIssues[field]) {
      setServerIssues((issues) => {
        const remainingIssues = { ...issues };
        delete remainingIssues[field];
        return remainingIssues;
      });
    }
    rerender();
  }

  function leaveField(field: PromptPostField): void {
    form.markLeft(field);
    rerender();
  }

  function toggleTool(tool: string, isChecked: boolean): void {
    const tools = form.getValue("worksWith");
    updateField("worksWith", isChecked ? [...tools, tool] : tools.filter((value) => value !== tool));
  }

  function showResult(result: PostPromptResult): void {
    if (result.status === "invalid") {
      setServerIssues(result.fieldErrors);
      setErrorMessage(t("fixFields"));
      const firstWrongField = PROMPT_POST_FIELDS.find((field) => result.fieldErrors[field]);
      if (firstWrongField) focusField(firstWrongField);
      return;
    }
    if (result.errorKey === "unauthenticated") {
      setErrorMessage(
        <>
          {t("errors.unauthenticated")}{" "}
          <Link href={{ pathname: "/login", query: { mode: "signIn", next: "/upload" } }}>{t("signedOut.action")}</Link>
        </>,
      );
      return;
    }
    setErrorMessage(t(`errors.${result.errorKey}`, { requestId: result.requestId ?? "" }));
  }

  function submitPost(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    form.markAllEdited();
    setErrorMessage(null);
    rerender();
    const invalidField = form.firstInvalidField;
    if (invalidField) {
      focusField(invalidField);
      return;
    }
    startSubmit(async () => {
      // On success the action redirects to the new page, so a result only comes back on failure.
      showResult(await postPrompt(form.toFormData(locale)));
    });
  }

  function renderTextField(field: TextField, options: { multiline?: boolean } = {}): ReactElement {
    const id = getFieldId(field);
    // Each text field's copy lives under `upload.form.fields.<field>` in the catalogue.
    const hint = t(`fields.${field}.hint`);
    const sharedProps = {
      id,
      name: field,
      className: "form-input",
      value: form.getValue(field),
      "aria-describedby": getDescribedBy(id, true),
      ...getControlState(field),
      onBlur: () => leaveField(field),
    };

    return (
      <PostFormField id={id} label={t(`fields.${field}.label`)} hint={hint} guidanceText={getGuidanceText(field)}>
        {options.multiline ? (
          <textarea rows={4} {...sharedProps} onChange={(event) => updateField(field, event.target.value)} />
        ) : field === "previewLineCount" ? (
          <input
            type="number"
            inputMode="numeric"
            min={PREVIEW_LINES.min}
            max={PREVIEW_LINES.max}
            step={1}
            {...sharedProps}
            onChange={(event) => updateField(field, event.target.value)}
          />
        ) : (
          <input
            type="text"
            autoComplete={field === "authorHandle" ? "nickname" : "off"}
            {...sharedProps}
            onChange={(event) => updateField(field, event.target.value)}
          />
        )}
      </PostFormField>
    );
  }

  const toolsGuidance = getGuidanceText("worksWith");

  return (
    <form className={styles.form} noValidate onSubmit={submitPost} aria-busy={isSubmitting}>
      {email && <p className={styles.account}>{t("signedInAs", { email })}</p>}

      <fieldset className={styles.group}>
        <legend className={styles.legend}>{t("sections.basics")}</legend>
        {renderTextField("title")}
        {renderTextField("tagline")}
        {renderTextField("summary", { multiline: true })}
        <PostFormField id="post-category" label={t("fields.category.label")} guidanceText={getGuidanceText("category")}>
          <select
            id="post-category"
            name="category"
            className="form-input"
            value={form.getValue("category")}
            aria-describedby={getDescribedBy("post-category", false)}
            {...getControlState("category")}
            onChange={(event) => updateField("category", event.target.value)}
            onBlur={() => leaveField("category")}
          >
            <option value="">{t("fields.category.placeholder")}</option>
            {promptCategories.map((category) => (
              <option key={category} value={category}>
                {tCategories(category)}
              </option>
            ))}
          </select>
        </PostFormField>
        {renderTextField("authorHandle")}
      </fieldset>

      <fieldset className={styles.group}>
        <legend className={styles.legend}>{t("sections.details")}</legend>
        {renderTextField("meantFor", { multiline: true })}
        {renderTextField("highlights", { multiline: true })}
        {renderTextField("usageSteps", { multiline: true })}
        <fieldset
          className={styles.tools}
          aria-describedby="post-works-with-hint post-works-with-guidance"
          aria-invalid={getIssue("worksWith") !== null}
        >
          <legend className="form-label">{t("fields.worksWith.label")}</legend>
          <ul className={styles.toolList}>
            {WORKS_WITH_TOOLS.map((tool, index) => (
              <li key={tool}>
                <label className={styles.tool}>
                  <input
                    id={`${getFieldId("worksWith")}-${index}`}
                    type="checkbox"
                    name="worksWith"
                    value={tool}
                    checked={form.getValue("worksWith").includes(tool)}
                    onChange={(event) => toggleTool(tool, event.target.checked)}
                    onBlur={() => leaveField("worksWith")}
                  />
                  {tool}
                </label>
              </li>
            ))}
          </ul>
          <p id="post-works-with-hint" className="form-hint">
            {t("fields.worksWith.hint")}
          </p>
          <p id="post-works-with-guidance" className="form-guidance" aria-live="polite" hidden={toolsGuidance === ""}>
            {toolsGuidance}
          </p>
        </fieldset>
      </fieldset>

      <fieldset className={styles.group}>
        <legend className={styles.legend}>{t("sections.file")}</legend>
        <PostFormField
          id="post-file"
          label={t("fields.file.label")}
          hint={t("fields.file.hint")}
          guidanceText={getGuidanceText("file")}
        >
          <input
            id="post-file"
            name="file"
            type="file"
            accept=".md,text/markdown"
            className="form-input"
            aria-describedby={getDescribedBy("post-file", true)}
            {...getControlState("file")}
            onChange={(event) => {
              updateField("file", event.target.files?.[0] ?? null);
              leaveField("file");
            }}
          />
        </PostFormField>
        {renderTextField("previewLineCount")}
      </fieldset>

      {errorMessage && <FormAlert tone="error">{errorMessage}</FormAlert>}
      <div className={styles.actions}>
        <SubmitButton label={t("submit")} busyLabel={t("submitting")} isBusy={isSubmitting} />
      </div>
    </form>
  );
}
