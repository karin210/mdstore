"use client";

import { useTranslations } from "next-intl";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useReducer, useState, useTransition, type FormEvent, type ReactElement, type ReactNode } from "react";
import { FormAlert } from "@/components/shared/FormAlert/FormAlert";
import { SubmitButton } from "@/components/shared/SubmitButton/SubmitButton";
import { getDescribedBy, PostFormField } from "@/components/upload/PostFormField/PostFormField";
import { CoauthorPicker } from "@/components/upload/CoauthorPicker/CoauthorPicker";
import { PostChipField } from "@/components/upload/PostChipField/PostChipField";
import { PostListField } from "@/components/upload/PostListField/PostListField";
import { usePostPreviewSender } from "@/components/upload/usePostPreviewSender/usePostPreviewSender";
import type { TestedModel } from "@/data/aiModels";
import { promptCategories } from "@/data/prompts";
import { Link, useRouter as useLocaleRouter } from "@/i18n/navigation";
import { PromptPostForm, type OutputExampleItem, type PromptPostValues } from "@/lib/forms/PromptPostForm";
import { new_output_example_path, OUTPUT_EXAMPLES_BUCKET, output_example_url } from "@/lib/outputExamples";
import type { PostPreviewSnapshot } from "@/lib/postPreview";
import { createBrowserSupabase } from "@/lib/supabase/browserClient";
import {
  LIST_LIMITS,
  MAX_COAUTHORS,
  MAX_OUTPUT_IMAGES,
  OUTPUT_CAPTION_MAX_LENGTH,
  OUTPUT_IMAGE_TYPES,
  PREVIEW_LINES,
  PROMPT_KINDS,
  PROMPT_POST_FIELDS,
  REVISION_NOTE_MAX_LENGTH,
  type PromptPostField,
  type ValidationIssue,
} from "@/lib/validation/promptPost";
import { postPrompt, type PostPromptResult } from "@/server/prompts/actions";
import { push_revision, type PushRevisionResult } from "@/server/reviews/actions";
import form_styles from "@/styles/form.module.css";
import utility_styles from "@/styles/utilities.module.css";
import styles from "./PostPromptForm.module.css";

type TextField = Exclude<
  PromptPostField,
  "kind" | "category" | "highlights" | "usageSteps" | "file" | "outputExamples" | "coauthors"
>;
type IssueMap = Partial<Record<PromptPostField, ValidationIssue>>;

type PostPromptFormProps =
  | {
      mode: "create";
      /** The live preview's byline: how the post will be credited. */
      username: string;
    }
  | {
      /** A new revision of an existing post, starting from its latest revision. */
      mode: "revision";
      post_id: string;
      slug: string;
      initial_values: Omit<PromptPostValues, "file" | "coauthors">;
      /** The latest revision's file, kept when no new file is chosen. */
      current_file_name: string;
      /** Its content, for the live preview while no new file is chosen. */
      current_file_text: string;
      /** The post's authors as the listing credits them ("@ana, @luis"), for the live preview. */
      byline: string;
      /** What the staff recorded the post as tested with; authors can't change it, the preview shows it. */
      tested_with: { works_with: string[]; tested_models: TestedModel[] };
    };

/** The id of a field's control, in kebab-case (`post-author-handle`); a group's first control is `${id}-0`. */
function getFieldId(field: PromptPostField): string {
  return `post-${field.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}`;
}

/** Moves focus to a field (the first control of a group) to lead the user to what needs a change. */
function focusField(field: PromptPostField): void {
  const is_group = field === "highlights" || field === "usageSteps" || field === "category";
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
  const [coauthors_not_added, set_coauthors_not_added] = useState<string[]>([]);
  const [note, set_note] = useState("");
  const [is_note_too_long, set_is_note_too_long] = useState(false);
  const [isSubmitting, startSubmit] = useTransition();
  // Counts the author's edits, so the live preview follows this form as soon as it changes.
  const [edit_count, set_edit_count] = useState(0);

  const preview_snapshot: PostPreviewSnapshot =
    props.mode === "revision"
      ? {
          values: form.getValues(),
          byline: props.byline,
          post_slug: props.slug,
          current_file: { name: props.current_file_name, text: props.current_file_text },
          tested_with: props.tested_with,
        }
      : {
          values: form.getValues(),
          // The poster first, then the co-authors they named, as the listing will credit them.
          byline: [props.username, ...form.getValue("coauthors")].map((username) => `@${username}`).join(", "),
          post_slug: null,
          current_file: null,
          // The staff add it once the post is in; a new post has none.
          tested_with: { works_with: [], tested_models: [] },
        };
  usePostPreviewSender(preview_snapshot, edit_count);

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
    set_edit_count((count) => count + 1);
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
      set_coauthors_not_added(result.coauthors_not_added);
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
  // Styled as an outlined button, but a real link, so it also opens with a middle click.
  const preview_link = (
    <Link href="/upload/preview" target="_blank" className={styles.previewLink}>
      {t("preview.open")}
      <span className={utility_styles.visuallyHidden}> {t("preview.newTab")}</span>
    </Link>
  );

  return (
    <form key={formKey} className={styles.form} noValidate onSubmit={submitPost} aria-busy={isSubmitting}>
      <div className={styles.previewBar}>
        <p className={styles.previewCaption}>{t("preview.caption")}</p>
        {preview_link}
      </div>

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
        <PostChipField
          id={getFieldId("category")}
          name="category"
          label={t("fields.category.label")}
          options={promptCategories.map((category) => ({ value: category, label: tCategories(category) }))}
          value={form.getValue("category")}
          guidance_text={getGuidanceText("category")}
          is_invalid={getIssue("category") !== null}
          on_change={(category) => updateField("category", category)}
          on_leave={() => leaveField("category")}
        />
        {renderTextField("title")}
        {renderTextField("tagline")}
        {renderTextField("summary", { multiline: true })}
      </fieldset>

      <fieldset className={styles.group}>
        {renderTextField("meantFor", { multiline: true })}
        <PostListField
          id={getFieldId("highlights")}
          label={t("fields.highlights.label")}
          hint={t("fields.highlights.hint", { max: LIST_LIMITS.highlights.max })}
          guidance_text={getGuidanceText("highlights")}
          // The form keeps one item per line, the format the validation and the server read.
          items={form.getValue("highlights").split("\n")}
          max_items={LIST_LIMITS.highlights.max}
          item_max_length={LIST_LIMITS.highlights.itemMax}
          get_item_label={(number) => t("fields.highlights.itemLabel", { number })}
          get_remove_label={(number) => t("fields.highlights.remove", { number })}
          add_label={t("fields.highlights.add")}
          control_state={getControlState("highlights")}
          on_change={(items) => updateField("highlights", items.join("\n"))}
          on_leave={() => leaveField("highlights")}
        />
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
        <PostListField
          id={getFieldId("usageSteps")}
          label={t("fields.usageSteps.label")}
          hint={t("fields.usageSteps.hint", { max: LIST_LIMITS.usageSteps.max })}
          guidance_text={getGuidanceText("usageSteps")}
          items={form.getValue("usageSteps").split("\n")}
          max_items={LIST_LIMITS.usageSteps.max}
          item_max_length={LIST_LIMITS.usageSteps.itemMax}
          marker="bullet"
          get_item_label={(number) => t("fields.usageSteps.itemLabel", { number })}
          get_remove_label={(number) => t("fields.usageSteps.remove", { number })}
          add_label={t("fields.usageSteps.add")}
          control_state={getControlState("usageSteps")}
          on_change={(items) => updateField("usageSteps", items.join("\n"))}
          on_leave={() => leaveField("usageSteps")}
        />
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

      {!is_revision && (
        <fieldset className={styles.group}>
          <legend className={styles.legend}>{t("sections.coauthors")}</legend>
          <CoauthorPicker
            id={getFieldId("coauthors")}
            coauthors={form.getValue("coauthors")}
            max_coauthors={MAX_COAUTHORS}
            guidance_text={getGuidanceText("coauthors")}
            on_change={(coauthors) => updateField("coauthors", coauthors)}
          />
        </fieldset>
      )}

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
          {coauthors_not_added.length > 0 && (
            <>
              {" "}
              {t("coauthorsNotAdded", {
                usernames: coauthors_not_added.map((username) => `@${username}`).join(", "),
              })}
            </>
          )}
        </FormAlert>
      )}
      {errorMessage && <FormAlert tone="error">{errorMessage}</FormAlert>}
      <div className={styles.actions}>
        {preview_link}
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
