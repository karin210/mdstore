import { z } from "zod";
import { prompt_kinds, promptCategories, type PromptCategory, type PromptKind } from "@/data/prompts";
import { normalize_username, USERNAME_PATTERN } from "@/lib/validation/username";

/**
 * Rules for posting a prompt, shared by the upload form (client) and the create action (server).
 * What a prompt was tested with (tools and models) is not here: the staff provide it, not the authors.
 * Each check returns an issue whose `key` lives under `upload.validation` in the catalogue, with
 * the values its message needs; the client translates it, the server returns it as a field error.
 */

export interface ValidationIssue {
  key:
    | "required"
    | "tooShort"
    | "tooLong"
    | "tooFewItems"
    | "tooManyItems"
    | "itemTooLong"
    | "chooseKind"
    | "chooseCategory"
    | "coauthorInvalid"
    | "fileRequired"
    | "fileType"
    | "fileTooLarge"
    | "fileEmpty"
    | "imageType"
    | "imageTooLarge"
    | "tooManyImages"
    | "imagesRequired"
    | "previewRange";
  values?: Record<string, number>;
}

/** What a post is: a prompt, a skill or an agent. Matches the `kind` check on posted_prompts. */
export const PROMPT_KINDS = prompt_kinds;
export type { PromptKind };

export const MAX_FILE_BYTES = 200 * 1024;

/** Output examples: screenshots of what the prompt produces (the bucket's own limits match; see the migration). */
export const OUTPUT_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"] as const;
export const MAX_OUTPUT_IMAGES = 6;
export const MAX_OUTPUT_IMAGE_BYTES = 2 * 1024 * 1024;
export const OUTPUT_CAPTION_MAX_LENGTH = 120;
export const PREVIEW_LINES = { min: 5, max: 40, default: 12 } as const;
/** Co-authors a new post can name; more can be added later from its review. */
export const MAX_COAUTHORS = 10;

const TEXT_LIMITS = {
  title: { min: 3, max: 80 },
  tagline: { min: 10, max: 140 },
  summary: { min: 20, max: 400 },
} as const;

/** Items per list field and characters per item; the forms cap their inputs with them. */
export const LIST_LIMITS = {
  meantFor: { min: 1, max: 6, itemMax: 60 },
  highlights: { min: 1, max: 7, itemMax: 160 },
  usageSteps: { min: 1, max: 8, itemMax: 300 },
} as const;

export type TextField = keyof typeof TEXT_LIMITS;
export type ListField = keyof typeof LIST_LIMITS;

/** One output example as the server stores it: a path in the `output-examples` bucket and its caption. */
export interface OutputExample {
  path: string;
  caption: string;
}

/**
 * One example on the form: either already stored (`path` set, from the previous version or a finished
 * upload) or a picked image (`file`) the browser uploads on submit, straight to Storage.
 */
export interface OutputExampleDraft {
  caption: string;
  path: string | null;
  file: { type: string; size: number } | null;
}

export type PromptPostField =
  TextField | ListField | "kind" | "category" | "file" | "previewLineCount" | "outputExamples" | "coauthors";

/** Field order on the form, used to focus the first wrong field on submit. */
export const PROMPT_POST_FIELDS: PromptPostField[] = [
  "kind",
  "category",
  "title",
  "tagline",
  "summary",
  "meantFor",
  "highlights",
  "outputExamples",
  "usageSteps",
  "file",
  "previewLineCount",
  "coauthors",
];

// ---------------------------------------------------------------------------
// Checks (one per kind of field)
// ---------------------------------------------------------------------------

export function checkText(field: TextField, valueRaw: string): ValidationIssue | null {
  const valueTrimmed = valueRaw.trim();
  const limits = TEXT_LIMITS[field];
  if (valueTrimmed === "") return { key: "required" };
  if (valueTrimmed.length < limits.min) return { key: "tooShort", values: { min: limits.min } };
  if (valueTrimmed.length > limits.max) return { key: "tooLong", values: { max: limits.max } };
  return null;
}

/** One item per non-empty line, trimmed. */
export function splitLines(valueRaw: string): string[] {
  return valueRaw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line !== "");
}

export function checkList(field: ListField, valueRaw: string): ValidationIssue | null {
  const items = splitLines(valueRaw);
  const limits = LIST_LIMITS[field];
  if (items.length === 0) return { key: "required" };
  if (items.length < limits.min) return { key: "tooFewItems", values: { min: limits.min } };
  if (items.length > limits.max) return { key: "tooManyItems", values: { max: limits.max } };
  if (items.some((item) => item.length > limits.itemMax))
    return { key: "itemTooLong", values: { max: limits.itemMax } };
  return null;
}

export function isPromptCategory(value: string): value is PromptCategory {
  return (promptCategories as readonly string[]).includes(value);
}

export function checkKind(value: string): ValidationIssue | null {
  return (PROMPT_KINDS as readonly string[]).includes(value) ? null : { key: "chooseKind" };
}

export function checkCategory(value: string): ValidationIssue | null {
  return isPromptCategory(value) ? null : { key: "chooseCategory" };
}

/**
 * The file's metadata; its text content is checked on the server (see checkFileContent).
 * A revision may leave the file out (`is_optional`) to keep the previous version's file.
 */
export function checkFile(file: { name: string; size: number } | null, is_optional = false): ValidationIssue | null {
  if (!file || file.name === "") return is_optional ? null : { key: "fileRequired" };
  if (!/\.md$/i.test(file.name)) return { key: "fileType" };
  if (file.size === 0) return { key: "fileEmpty" };
  if (file.size > MAX_FILE_BYTES) return { key: "fileTooLarge" };
  return null;
}

export function checkFileContent(content: string): ValidationIssue | null {
  return content.trim() === "" ? { key: "fileEmpty" } : null;
}

/** Where an example is stored: the uploader's folder, then a file named by a random id. */
export const OUTPUT_EXAMPLE_PATH_PATTERN =
  /^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(png|jpg|webp)$/;

/**
 * Required: 1 to MAX_OUTPUT_IMAGES examples (a listing shows what the prompt produces), each a PNG, JPEG or WebP of up to MAX_OUTPUT_IMAGE_BYTES (checked
 * while it is still a picked file), each caption short. Whose files they are is checked on the server.
 */
export function check_output_examples(examples: OutputExampleDraft[]): ValidationIssue | null {
  if (examples.length === 0) return { key: "imagesRequired" };
  if (examples.length > MAX_OUTPUT_IMAGES) return { key: "tooManyImages", values: { max: MAX_OUTPUT_IMAGES } };
  const accepted_types: readonly string[] = OUTPUT_IMAGE_TYPES;
  const files = examples.flatMap((example) => (example.file ? [example.file] : []));
  if (files.some((file) => !accepted_types.includes(file.type) || file.size === 0)) return { key: "imageType" };
  if (files.some((file) => file.size > MAX_OUTPUT_IMAGE_BYTES)) return { key: "imageTooLarge" };
  if (examples.some((example) => example.caption.trim().length > OUTPUT_CAPTION_MAX_LENGTH)) {
    return { key: "tooLong", values: { max: OUTPUT_CAPTION_MAX_LENGTH } };
  }
  return null;
}

/**
 * Optional: up to MAX_COAUTHORS usernames, each well formed and named once. Whether they exist is checked on the
 * server when they are added (the form only offers users its search found).
 */
export function check_coauthors(usernames: string[]): ValidationIssue | null {
  if (usernames.length > MAX_COAUTHORS) return { key: "tooManyItems", values: { max: MAX_COAUTHORS } };
  const normalized = usernames.map((username) => normalize_username(username).toLowerCase());
  const is_well_formed = normalized.every((username) => USERNAME_PATTERN.test(username));
  return is_well_formed && new Set(normalized).size === normalized.length ? null : { key: "coauthorInvalid" };
}

export function checkPreviewLineCount(valueRaw: string): ValidationIssue | null {
  const valueNumber = Number(valueRaw);
  const isInRange =
    Number.isInteger(valueNumber) && valueNumber >= PREVIEW_LINES.min && valueNumber <= PREVIEW_LINES.max;
  return valueRaw.trim() !== "" && isInRange
    ? null
    : { key: "previewRange", values: { min: PREVIEW_LINES.min, max: PREVIEW_LINES.max } };
}

// ---------------------------------------------------------------------------
// Server schema (the same checks, as a Zod schema the create action parses with)
// ---------------------------------------------------------------------------

function asRefinement<Value>(check: (value: Value) => ValidationIssue | null) {
  return (value: Value, ctx: z.RefinementCtx): void => {
    const issue = check(value);
    if (issue) ctx.addIssue({ code: "custom", message: issue.key, params: issue.values });
  };
}

const textSchema = (field: TextField) =>
  z
    .string()
    .superRefine(asRefinement((value: string) => checkText(field, value)))
    .transform((value) => value.trim());

const listSchema = (field: ListField) =>
  z
    .string()
    .superRefine(asRefinement((value: string) => checkList(field, value)))
    .transform(splitLines);

const output_examples_schema = z
  .array(z.strictObject({ path: z.string(), caption: z.string().transform((value) => value.trim()) }))
  .superRefine((examples, ctx) => {
    const issue =
      check_output_examples(examples.map((example) => ({ ...example, file: null }))) ??
      (examples.every((example) => OUTPUT_EXAMPLE_PATH_PATTERN.test(example.path))
        ? null
        : { key: "imageType" as const });
    if (issue) ctx.addIssue({ code: "custom", message: issue.key, params: issue.values });
  });

const prompt_post_object = z.strictObject({
  kind: z
    .string()
    .superRefine(asRefinement(checkKind))
    .transform((value) => value as PromptKind),
  title: textSchema("title"),
  tagline: textSchema("tagline"),
  summary: textSchema("summary"),
  category: z
    .string()
    .superRefine(asRefinement(checkCategory))
    .transform((value) => value as PromptCategory),
  meantFor: listSchema("meantFor"),
  highlights: listSchema("highlights"),
  usageSteps: listSchema("usageSteps"),
  file: z
    .custom<File>((value) => value instanceof File, { message: "fileRequired" })
    .superRefine(asRefinement(checkFile)),
  previewLineCount: z
    .string()
    .superRefine(asRefinement(checkPreviewLineCount))
    .transform((value) => Number(value)),
  /** New uploads (in the poster's folder) and, for a revision, examples kept from the previous version. */
  outputExamples: output_examples_schema,
});

/** A new post: the listing's fields plus the co-authors to add once it exists. */
export const promptPostSchema = prompt_post_object.extend({
  coauthors: z
    .array(z.string())
    .superRefine(asRefinement(check_coauthors))
    .transform((usernames) => usernames.map(normalize_username)),
});

export type PromptPostInput = z.output<typeof promptPostSchema>;

/** Longest "what changed" note sent with a revision (it becomes a comment in the review). */
export const REVISION_NOTE_MAX_LENGTH = 1000;

/**
 * A new revision of an existing post: the same fields, a file that may be left out to keep the
 * previous one, and an optional note for the reviewers.
 */
export const prompt_revision_schema = prompt_post_object.extend({
  file: z
    .custom<File | null>((value) => value === null || value instanceof File, { message: "fileRequired" })
    .superRefine(asRefinement((file: File | null) => checkFile(file, true)))
    .transform((file) => (file && file.name !== "" ? file : null)),
  note: z
    .string()
    .max(REVISION_NOTE_MAX_LENGTH, { message: "tooLong" })
    .transform((value) => value.trim()),
});

export type PromptRevisionInput = z.output<typeof prompt_revision_schema>;
