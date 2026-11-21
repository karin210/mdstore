"use client";

import { useTranslations } from "next-intl";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useReducer, useState, useTransition, type FormEvent, type ReactElement, type ReactNode } from "react";
import { FormAlert } from "@/components/shared/FormAlert/FormAlert";
import { SubmitButton } from "@/components/shared/SubmitButton/SubmitButton";
import { getDescribedBy, PostFormField } from "@/components/upload/PostFormField/PostFormField";
import { ai_models, model_families, model_family_names, type ModelId } from "@/data/aiModels";
import { promptCategories } from "@/data/prompts";
import { Link, useRouter as useLocaleRouter } from "@/i18n/navigation";
import { PromptPostForm, type OutputExampleItem, type PromptPostValues } from "@/lib/forms/PromptPostForm";
import { new_output_example_path, OUTPUT_EXAMPLES_BUCKET, output_example_url } from "@/lib/outputExamples";
import { createBrowserSupabase } from "@/lib/supabase/browserClient";
import {
  MAX_OUTPUT_IMAGES,
  OUTPUT_CAPTION_MAX_LENGTH,
  OUTPUT_IMAGE_TYPES,
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

type TextField = Exclude<
  PromptPostField,
  "kind" | "category" | "worksWith" | "testedModels" | "file" | "outputExamples"
>;
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
  const is_group = field === "worksWith" || field === "testedModels";
  const id = is_group ? `${getFieldId(field)}-0` : getFieldId(field);
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

  /** Ticking a model marks it tested; unticking it also drops its recommendation. */
  function toggle_model(model_id: ModelId, is_tested: boolean): void {
    const models = form.getValue("testedModels");
    updateField(
      "testedModels",
      is_tested ? [...models, { model_id, recommended: false }] : models.filter((model) => model.model_id !== model_id),
    );
  }

  function toggle_recommended(model_id: ModelId, is_recommended: boolean): void {
    updateField(
      "testedModels",
      form
        .getValue("testedModels")
        .map((model) => (model.model_id === model_id ? { ...model, recommended: is_recommended } : model)),
    );
  }

  /** A picked image's size for the list, e.g. "340 KB". */
  function format_size(bytes: number): string {
    if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  function add_example_images(files: FileList | null): void {
    if (!files || files.length === 0) return;
    const picked: OutputExampleItem[] = Array.from(files).map((file) => ({
      id: crypto.randomUUID(),
      caption: "",
      path: null,
      file,
    }));
    updateField("outputExamples", [...form.getValue("outputExamples"), ...picked]);
    leaveField("outputExamples");
  }

  function change_example_caption(id: string, caption: string): void {
    updateField(
      "outputExamples",
      form.getValue("outputExamples").map((example) => (example.id === id ? { ...example, caption } : example)),
    );
  }

  function remove_example(id: string): void {
    const removed = form.getValue("outputExamples").find((example) => example.id === id);
    updateField(
      "outputExamples",
      form.getValue("outputExamples").filter((example) => example.id !== id),
    );
    // A picked image that already went to Storage (in a submit that failed later) is no longer wanted: best effort.
    if (removed?.file && removed.path) {
      void createBrowserSupabase()?.storage.from(OUTPUT_EXAMPLES_BUCKET).remove([removed.path]);
    }
  }

  /**
   * Uploads the picked images straight to Storage, into the user's own folder: a Server Action can't
   * carry them (hosting caps request bodies at 4.5 MB), so the action only receives their paths. The ones
   * that went up keep their path, so a retry after a failure doesn't send them again.
   */
  async function upload_example_images(): Promise<boolean> {
    const pending = form.getValue("outputExamples").filter((example) => example.file && !example.path);
    if (pending.length === 0) return true;
    const supabase = createBrowserSupabase();
    const user_id = supabase ? (await supabase.auth.getClaims()).data?.claims.sub : undefined;
    if (!supabase || !user_id) return false;

    const results = await Promise.all(
      pending.map(async (example) => {
        const file = example.file as File;
        const path = new_output_example_path(user_id, file.type);
        const { error } = await supabase.storage
          .from(OUTPUT_EXAMPLES_BUCKET)
          .upload(path, file, { contentType: file.type, cacheControl: "31536000" });
        return { id: example.id, path: error ? null : path };
      }),
    );
    const paths = new Map(results.map((result) => [result.id, result.path]));
    form.setValue(
      "outputExamples",
      form.getValue("outputExamples").map((example) => ({ ...example, path: paths.get(example.id) ?? example.path })),
    );
    rerender();
    return results.every((result) => result.path !== null);
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
    startSubmit(async () => {
      if (!(await upload_example_images())) {
        setErrorMessage(t("errors.imageUpload"));
        return;
      }
      if (props.mode === "revision") {
        const form_data = form.toFormData();
        form_data.set("note", note);
        showRevisionResult(await push_revision(props.post_id, form_data));
        return;
      }
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

  const examples = form.getValue("outputExamples");
  const toolsGuidance = getGuidanceText("worksWith");
  const models_guidance = getGuidanceText("testedModels");
  // Every model, numbered in reading order so the first box gets the field's focus id (`-0`).
  const model_ids = Object.keys(ai_models) as ModelId[];

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
        <fieldset
          className={styles.tools}
          aria-describedby="post-tested-models-hint post-tested-models-guidance"
          aria-invalid={getIssue("testedModels") !== null}
        >
          <legend className={form_styles.label}>{t("fields.testedModels.label")}</legend>
          <p id="post-tested-models-hint" className={form_styles.hint}>
            {t("fields.testedModels.hint")}
          </p>
          <div className={styles.modelFamilies}>
            {model_families.map((family) => (
              <div key={family} className={styles.modelFamily}>
                <p className={styles.modelFamilyName} aria-hidden="true">
                  {model_family_names[family]}
                </p>
                <ul className={styles.modelList} aria-label={model_family_names[family]}>
                  {model_ids
                    .filter((model_id) => ai_models[model_id].family === family)
                    .map((model_id) => {
                      const choice = form.getValue("testedModels").find((model) => model.model_id === model_id);
                      const name = ai_models[model_id].name;
                      return (
                        <li key={model_id} className={styles.modelRow}>
                          <label className={styles.tool}>
                            <input
                              id={`${getFieldId("testedModels")}-${model_ids.indexOf(model_id)}`}
                              type="checkbox"
                              name="testedModels"
                              value={model_id}
                              checked={choice !== undefined}
                              onChange={(event) => toggle_model(model_id, event.target.checked)}
                              onBlur={() => leaveField("testedModels")}
                            />
                            {name}
                          </label>
                          {choice && (
                            <label className={styles.recommend}>
                              <input
                                type="checkbox"
                                name="recommendedModels"
                                value={model_id}
                                checked={choice.recommended}
                                aria-label={t("fields.testedModels.recommendedLabel", { model: name })}
                                onChange={(event) => toggle_recommended(model_id, event.target.checked)}
                              />
                              <span aria-hidden="true">{t("fields.testedModels.recommended")}</span>
                            </label>
                          )}
                        </li>
                      );
                    })}
                </ul>
              </div>
            ))}
          </div>
          <p
            id="post-tested-models-guidance"
            className={form_styles.guidance}
            aria-live="polite"
            hidden={models_guidance === ""}
          >
            {models_guidance}
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

      <fieldset className={styles.group}>
        <legend className={styles.legend}>{t("sections.examples")}</legend>
        <PostFormField
          id="post-output-examples"
          label={t("fields.outputExamples.label")}
          hint={t("fields.outputExamples.hint", { max: MAX_OUTPUT_IMAGES })}
          guidanceText={getGuidanceText("outputExamples")}
        >
          <input
            id="post-output-examples"
            type="file"
            multiple
            accept={OUTPUT_IMAGE_TYPES.join(",")}
            className={form_styles.input}
            aria-describedby={getDescribedBy("post-output-examples", true)}
            {...getControlState("outputExamples")}
            onChange={(event) => {
              add_example_images(event.target.files);
              // Cleared so choosing the same file again (after removing it) still fires a change.
              event.target.value = "";
            }}
          />
        </PostFormField>
        {examples.length > 0 && (
          <ul className={styles.examples}>
            {examples.map((example, index) => {
              const number = index + 1;
              const caption_id = `post-output-example-caption-${index}`;
              const stored_url = example.file ? null : example.path ? output_example_url(example.path) : null;
              return (
                <li key={example.id} className={styles.example}>
                  {stored_url ? (
                    <Image src={stored_url} alt="" width={96} height={64} unoptimized className={styles.thumb} />
                  ) : (
                    <span className={styles.thumb} data-placeholder="true" aria-hidden="true" />
                  )}
                  <div className={styles.exampleBody}>
                    <p className={styles.exampleName}>
                      {example.file
                        ? `${example.file.name} · ${format_size(example.file.size)}`
                        : t("fields.outputExamples.stored", { number })}
                    </p>
                    <label htmlFor={caption_id} className={form_styles.label}>
                      {t("fields.outputExamples.captionLabel", { number })}
                    </label>
                    <input
                      id={caption_id}
                      type="text"
                      autoComplete="off"
                      className={form_styles.input}
                      maxLength={OUTPUT_CAPTION_MAX_LENGTH}
                      value={example.caption}
                      onChange={(event) => change_example_caption(example.id, event.target.value)}
                    />
                  </div>
                  <button type="button" className={styles.removeExample} onClick={() => remove_example(example.id)}>
                    {t("fields.outputExamples.remove", { number })}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
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
          {t("submitted")} <Link href={`/prompts/${submitted_slug}/review`}>{t("openReview")}</Link>{" "}
          <Link href="/my-prompts">{t("myPrompts")}</Link>
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
