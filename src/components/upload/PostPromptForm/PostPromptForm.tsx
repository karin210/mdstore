"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useReducer, useState, useTransition, type FormEvent, type ReactElement, type ReactNode } from "react";
import { FormAlert } from "@/components/global/FormAlert/FormAlert";
import { SubmitButton } from "@/components/global/SubmitButton/SubmitButton";
import { getDescribedBy, PostFormField } from "@/components/upload/PostFormField/PostFormField";
import { promptCategories } from "@/data/prompts";
import { Link, useRouter as useLocaleRouter } from "@/i18n/navigation";
import { PromptPostForm, type PromptPostValues } from "@/lib/forms/PromptPostForm";
import {
  PREVIEW_LINES,
  PROMPT_KINDS,
  PROMPT_POST_FIELDS,
  REVISION_NOTE_MAX_LENGTH,
  WORKS_WITH_TOOLS,
  type PromptPostField,
  type ValidationIssue,
} from "@/lib/validation/promptPost";
import { postPrompt, type PostPromptResult } from "@/server/prompts/actions";
import { push_revision, type PushRevisionResult } from "@/server/reviews/actions";
import form_styles from "@/styles/form.module.css";
import styles from "./PostPromptForm.module.css";

type TextField = Exclude<PromptPostField, "kind" | "category" | "worksWith" | "file">;
type IssueMap = Partial<Record<PromptPostField, ValidationIssue>>;

type PostPromptFormProps =
  | {
      mode: "create";
      /** The signed-in user's email, shown so they know which account posts. */
      email: string | null;
      /** Shown as the byline, so they know how the post will be credited. */
      username: string;
    }
  | {
      /** A new revision of an existing post, starting from its latest revision. */
      mode: "revision";
      post_id: string;
      slug: string;
      initial_values: Omit<PromptPostValues, "file">;
      /** The latest revision's file, kept when no new file is chosen. */
      current_file_name: string;
    };

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
 * types (rules shared with the server) and focuses the first wrong field on submit.
 * - create: posts a new prompt for review, clears itself and links to the new review.
 * - revision: pushes a new version of an existing post to its review, then opens the review.
 */
export function PostPromptForm(props: PostPromptFormProps): ReactElement {
  const t = useTranslations("upload.form");
  const tValidation = useTranslations("upload.validation");
  const tCategories = useTranslations("prompts.categories");
  const tReview = useTranslations("review");
  const router = useRouter();
  const locale_router = useLocaleRouter();
  const is_revision = props.mode === "revision";
  const [form] = useState(() => new PromptPostForm(is_revision ? props.initial_values : undefined));
  const [, rerender] = useReducer((count: number) => count + 1, 0);
  // Bumping the key remounts the form, which clears the uncontrolled file input after a success.
  const [formKey, setFormKey] = useState(0);
  const [serverIssues, setServerIssues] = useState<IssueMap>({});
  const [errorMessage, setErrorMessage] = useState<ReactNode>(null);
  const [submitted_slug, set_submitted_slug] = useState<string | null>(null);
  const [note, set_note] = useState("");
  const [is_note_too_long, set_is_note_too_long] = useState(false);
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

  function showFieldErrors(fieldErrors: IssueMap): void {
    setServerIssues(fieldErrors);
    setErrorMessage(t("fixFields"));
    const firstWrongField = PROMPT_POST_FIELDS.find((field) => fieldErrors[field]);
    if (firstWrongField) focusField(firstWrongField);
    else document.getElementById("post-note")?.focus();
  }

  function showRevisionResult(result: PushRevisionResult): void {
    if (props.mode !== "revision") return;
    if (result.status === "ok") {
      locale_router.push(`/prompts/${props.slug}/review`);
      // The review page is rendered per request, so a refresh shows the new revision.
      router.refresh();
      return;
    }
    if (result.status === "invalid") {
      set_is_note_too_long(result.note_too_long);
      showFieldErrors(result.field_errors);
      return;
    }
    setErrorMessage(tReview(`errors.${result.error_key}`, { requestId: result.request_id ?? "" }));
  }

  function showResult(result: PostPromptResult): void {
    if (result.status === "submitted") {
      form.reset();
      setServerIssues({});
      setFormKey((key) => key + 1);
      set_submitted_slug(result.slug);
      rerender();
      // The "my submissions" list is server-rendered, so ask the server to re-render it with the new post.
      router.refresh();
      return;
    }
    if (result.status === "invalid") {
      showFieldErrors(result.fieldErrors);
      return;
    }
    if (result.errorKey === "usernameRequired") {
      // The page asks for a username before showing the form; a refresh brings that back.
      router.refresh();
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
    set_submitted_slug(null);
    rerender();
    const invalidField = form.firstInvalidField;
    if (invalidField) {
      focusField(invalidField);
      return;
    }
    if (props.mode === "revision") {
      const form_data = form.toFormData();
      form_data.set("note", note);
      const post_id = props.post_id;
      startSubmit(async () => showRevisionResult(await push_revision(post_id, form_data)));
      return;
    }
    startSubmit(async () => {
      showResult(await postPrompt(form.toFormData()));
    });
  }

  function renderTextField(field: TextField, options: { multiline?: boolean } = {}): ReactElement {
    const id = getFieldId(field);
    // Each text field's copy lives under `upload.form.fields.<field>` in the catalogue.
    const hint = t(`fields.${field}.hint`);
    const sharedProps = {
      id,
      name: field,
      className: form_styles.input,
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
            autoComplete="off"
            {...sharedProps}
            onChange={(event) => updateField(field, event.target.value)}
          />
        )}
      </PostFormField>
    );
  }

  const toolsGuidance = getGuidanceText("worksWith");

  return (
    <form key={formKey} className={styles.form} noValidate onSubmit={submitPost} aria-busy={isSubmitting}>
      {props.mode === "create" && (
        <p className={styles.account}>
          {props.email
            ? t("signedInAsWithUsername", { email: props.email, username: props.username })
            : t("postingAs", { username: props.username })}
        </p>
      )}

      <fieldset className={styles.group}>
        <legend className={styles.legend}>{t("sections.basics")}</legend>
        <PostFormField
          id="post-kind"
          label={t("fields.kind.label")}
          hint={t("fields.kind.hint")}
          guidanceText={getGuidanceText("kind")}
        >
          <select
            id="post-kind"
            name="kind"
            className={form_styles.input}
            value={form.getValue("kind")}
            aria-describedby={getDescribedBy("post-kind", true)}
            {...getControlState("kind")}
            onChange={(event) => updateField("kind", event.target.value as PromptPostValues["kind"])}
            onBlur={() => leaveField("kind")}
          >
            {PROMPT_KINDS.map((kind) => (
              <option key={kind} value={kind}>
                {t(`fields.kind.options.${kind}`)}
              </option>
            ))}
          </select>
        </PostFormField>
        {renderTextField("title")}
        {renderTextField("tagline")}
        {renderTextField("summary", { multiline: true })}
        <PostFormField id="post-category" label={t("fields.category.label")} guidanceText={getGuidanceText("category")}>
          <select
            id="post-category"
            name="category"
            className={form_styles.input}
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
          <legend className={form_styles.label}>{t("fields.worksWith.label")}</legend>
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
          <p id="post-works-with-hint" className={form_styles.hint}>
            {t("fields.worksWith.hint")}
          </p>
          <p
            id="post-works-with-guidance"
            className={form_styles.guidance}
            aria-live="polite"
            hidden={toolsGuidance === ""}
          >
            {toolsGuidance}
          </p>
        </fieldset>
      </fieldset>

      <fieldset className={styles.group}>
        <legend className={styles.legend}>{t("sections.file")}</legend>
        <PostFormField
          id="post-file"
          label={is_revision ? tReview("revise.fileLabel") : t("fields.file.label")}
          hint={
            props.mode === "revision"
              ? tReview("revise.fileHint", { fileName: props.current_file_name })
              : t("fields.file.hint")
          }
          guidanceText={getGuidanceText("file")}
        >
          <input
            id="post-file"
            name="file"
            type="file"
            accept=".md,text/markdown"
            className={form_styles.input}
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

      {is_revision && (
        <fieldset className={styles.group}>
          <legend className={styles.legend}>{tReview("revise.noteSection")}</legend>
          <PostFormField
            id="post-note"
            label={tReview("revise.noteLabel")}
            hint={tReview("revise.noteHint")}
            guidanceText={is_note_too_long ? tValidation("tooLong", { max: REVISION_NOTE_MAX_LENGTH }) : ""}
          >
            <textarea
              id="post-note"
              name="note"
              rows={3}
              className={form_styles.input}
              maxLength={REVISION_NOTE_MAX_LENGTH}
              value={note}
              aria-describedby={getDescribedBy("post-note", true)}
              aria-invalid={is_note_too_long}
              onChange={(event) => {
                set_note(event.target.value);
                set_is_note_too_long(false);
              }}
            />
          </PostFormField>
        </fieldset>
      )}

      {submitted_slug && (
        <FormAlert tone="success">
          {t("submitted")} <Link href={`/prompts/${submitted_slug}/review`}>{t("openReview")}</Link>
        </FormAlert>
      )}
      {errorMessage && <FormAlert tone="error">{errorMessage}</FormAlert>}
      <div className={styles.actions}>
        {is_revision ? (
          <SubmitButton
            label={tReview("revise.submit")}
            busyLabel={tReview("revise.submitting")}
            isBusy={isSubmitting}
          />
        ) : (
          <SubmitButton label={t("submit")} busyLabel={t("submitting")} isBusy={isSubmitting} />
        )}
      </div>
    </form>
  );
}
