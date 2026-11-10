"use client";

import { useLocale, useTranslations } from "next-intl";
import {
  useReducer,
  useState,
  useTransition,
  type FormEvent,
  type ReactElement,
  type ReactNode,
} from "react";
import { FormAlert } from "@/components/global/FormAlert";
import { SubmitButton } from "@/components/global/SubmitButton";
import { get_described_by, PostFormField } from "@/components/upload/PostFormField";
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
import { post_prompt, type PostPromptResult } from "@/server/prompts/actions";
import styles from "./PostPromptForm.module.css";

type TextField = Exclude<PromptPostField, "category" | "works_with" | "file">;
type IssueMap = Partial<Record<PromptPostField, ValidationIssue>>;

/** Each text field's key under `upload.form.fields` in the catalogue. */
const FIELD_COPY_KEYS = {
  title: "title",
  tagline: "tagline",
  summary: "summary",
  author_handle: "authorHandle",
  meant_for: "meantFor",
  highlights: "highlights",
  usage_steps: "usageSteps",
  preview_line_count: "previewLineCount",
} as const satisfies Record<TextField, string>;

interface PostPromptFormProps {
  /** The signed-in user's email, shown so they know which account posts. */
  email: string | null;
}

/** The id of a field's control; a checkbox group's first box is `${id}-0`. */
function get_field_id(field: PromptPostField): string {
  return `post-${field.replaceAll("_", "-")}`;
}

/** Moves focus to a field (the first box of a checkbox group) to lead the user to what needs a change. */
function focus_field(field: PromptPostField): void {
  const id = field === "works_with" ? `${get_field_id(field)}-0` : get_field_id(field);
  document.getElementById(id)?.focus();
}

/**
 * The upload form: the fields /prompts/[slug] shows, plus the .md file. It validates as the user
 * types (rules shared with the server), focuses the first wrong field on submit, and opens the
 * new prompt's page once it is posted.
 */
export function PostPromptForm({ email }: PostPromptFormProps): ReactElement {
  const t = useTranslations("upload.form");
  const t_validation = useTranslations("upload.validation");
  const t_categories = useTranslations("prompts.categories");
  const locale = useLocale();
  const [form] = useState(() => new PromptPostForm());
  const [, rerender] = useReducer((count: number) => count + 1, 0);
  const [server_issues, set_server_issues] = useState<IssueMap>({});
  const [error_message, set_error_message] = useState<ReactNode>(null);
  const [is_submitting, start_submit] = useTransition();

  function get_issue(field: PromptPostField): ValidationIssue | null {
    return form.get_guidance(field) ?? server_issues[field] ?? null;
  }

  function get_guidance_text(field: PromptPostField): string {
    const issue = get_issue(field);
    return issue ? t_validation(issue.key, issue.values ?? {}) : "";
  }

  /** The state attributes every control of a field carries (see "Forms" in globals.css). */
  function get_control_state(field: PromptPostField): Record<string, string | boolean | undefined> {
    const has_server_issue = Boolean(server_issues[field]);
    return {
      "aria-invalid": get_issue(field) !== null,
      "data-mark": has_server_issue ? "error" : form.get_border_mark(field),
      "data-valid": form.is_field_valid(field) && !has_server_issue,
    };
  }

  function update_field<Field extends PromptPostField>(field: Field, value: PromptPostValues[Field]): void {
    form.set_value(field, value);
    if (server_issues[field]) {
      set_server_issues((issues) => {
        const remaining_issues = { ...issues };
        delete remaining_issues[field];
        return remaining_issues;
      });
    }
    rerender();
  }

  function leave_field(field: PromptPostField): void {
    form.mark_left(field);
    rerender();
  }

  function toggle_tool(tool: string, is_checked: boolean): void {
    const tools = form.get_value("works_with");
    update_field("works_with", is_checked ? [...tools, tool] : tools.filter((value) => value !== tool));
  }

  function show_result(result: PostPromptResult): void {
    if (result.status === "invalid") {
      set_server_issues(result.field_errors);
      set_error_message(t("fixFields"));
      const first_wrong_field = PROMPT_POST_FIELDS.find((field) => result.field_errors[field]);
      if (first_wrong_field) focus_field(first_wrong_field);
      return;
    }
    if (result.error_key === "unauthenticated") {
      set_error_message(
        <>
          {t("errors.unauthenticated")}{" "}
          <Link href={{ pathname: "/login", query: { mode: "signIn", next: "/upload" } }}>{t("signedOut.action")}</Link>
        </>,
      );
      return;
    }
    set_error_message(t(`errors.${result.error_key}`, { requestId: result.request_id ?? "" }));
  }

  function submit_post(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    form.mark_all_edited();
    set_error_message(null);
    rerender();
    const invalid_field = form.first_invalid_field;
    if (invalid_field) {
      focus_field(invalid_field);
      return;
    }
    start_submit(async () => {
      // On success the action redirects to the new page, so a result only comes back on failure.
      show_result(await post_prompt(form.to_form_data(locale)));
    });
  }

  function render_text_field(field: TextField, options: { multiline?: boolean } = {}): ReactElement {
    const id = get_field_id(field);
    const copy_key = FIELD_COPY_KEYS[field];
    const hint = t(`fields.${copy_key}.hint`);
    const shared_props = {
      id,
      name: field,
      className: "form-input",
      value: form.get_value(field),
      "aria-describedby": get_described_by(id, true),
      ...get_control_state(field),
      onBlur: () => leave_field(field),
    };

    return (
      <PostFormField id={id} label={t(`fields.${copy_key}.label`)} hint={hint} guidance_text={get_guidance_text(field)}>
        {options.multiline ? (
          <textarea
            rows={4}
            {...shared_props}
            onChange={(event) => update_field(field, event.target.value)}
          />
        ) : field === "preview_line_count" ? (
          <input
            type="number"
            inputMode="numeric"
            min={PREVIEW_LINES.min}
            max={PREVIEW_LINES.max}
            step={1}
            {...shared_props}
            onChange={(event) => update_field(field, event.target.value)}
          />
        ) : (
          <input
            type="text"
            autoComplete={field === "author_handle" ? "nickname" : "off"}
            {...shared_props}
            onChange={(event) => update_field(field, event.target.value)}
          />
        )}
      </PostFormField>
    );
  }

  const tools_guidance = get_guidance_text("works_with");

  return (
    <form className={styles.form} noValidate onSubmit={submit_post} aria-busy={is_submitting}>
      {email && <p className={styles.account}>{t("signedInAs", { email })}</p>}

      <fieldset className={styles.group}>
        <legend className={styles.legend}>{t("sections.basics")}</legend>
        {render_text_field("title")}
        {render_text_field("tagline")}
        {render_text_field("summary", { multiline: true })}
        <PostFormField id="post-category" label={t("fields.category.label")} guidance_text={get_guidance_text("category")}>
          <select
            id="post-category"
            name="category"
            className="form-input"
            value={form.get_value("category")}
            aria-describedby={get_described_by("post-category", false)}
            {...get_control_state("category")}
            onChange={(event) => update_field("category", event.target.value)}
            onBlur={() => leave_field("category")}
          >
            <option value="">{t("fields.category.placeholder")}</option>
            {promptCategories.map((category) => (
              <option key={category} value={category}>
                {t_categories(category)}
              </option>
            ))}
          </select>
        </PostFormField>
        {render_text_field("author_handle")}
      </fieldset>

      <fieldset className={styles.group}>
        <legend className={styles.legend}>{t("sections.details")}</legend>
        {render_text_field("meant_for", { multiline: true })}
        {render_text_field("highlights", { multiline: true })}
        {render_text_field("usage_steps", { multiline: true })}
        <fieldset
          className={styles.tools}
          aria-describedby="post-works-with-hint post-works-with-guidance"
          aria-invalid={get_issue("works_with") !== null}
        >
          <legend className="form-label">{t("fields.worksWith.label")}</legend>
          <ul className={styles.toolList}>
            {WORKS_WITH_TOOLS.map((tool, index) => (
              <li key={tool}>
                <label className={styles.tool}>
                  <input
                    id={`${get_field_id("works_with")}-${index}`}
                    type="checkbox"
                    name="works_with"
                    value={tool}
                    checked={form.get_value("works_with").includes(tool)}
                    onChange={(event) => toggle_tool(tool, event.target.checked)}
                    onBlur={() => leave_field("works_with")}
                  />
                  {tool}
                </label>
              </li>
            ))}
          </ul>
          <p id="post-works-with-hint" className="form-hint">
            {t("fields.worksWith.hint")}
          </p>
          <p id="post-works-with-guidance" className="form-guidance" aria-live="polite" hidden={tools_guidance === ""}>
            {tools_guidance}
          </p>
        </fieldset>
      </fieldset>

      <fieldset className={styles.group}>
        <legend className={styles.legend}>{t("sections.file")}</legend>
        <PostFormField
          id="post-file"
          label={t("fields.file.label")}
          hint={t("fields.file.hint")}
          guidance_text={get_guidance_text("file")}
        >
          <input
            id="post-file"
            name="file"
            type="file"
            accept=".md,text/markdown"
            className="form-input"
            aria-describedby={get_described_by("post-file", true)}
            {...get_control_state("file")}
            onChange={(event) => {
              update_field("file", event.target.files?.[0] ?? null);
              leave_field("file");
            }}
          />
        </PostFormField>
        {render_text_field("preview_line_count")}
      </fieldset>

      {error_message && <FormAlert tone="error">{error_message}</FormAlert>}
      <div className={styles.actions}>
        <SubmitButton label={t("submit")} busy_label={t("submitting")} is_busy={is_submitting} />
      </div>
    </form>
  );
}
