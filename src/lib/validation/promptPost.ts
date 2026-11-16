import { z } from "zod";
import { install_kinds, promptCategories, type InstallKind, type PromptCategory } from "@/data/prompts";

/**
 * Rules for posting a prompt, shared by the upload form (client) and the create action (server).
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
    | "chooseInstallKind"
    | "chooseTool"
    | "fileRequired"
    | "fileType"
    | "fileTooLarge"
    | "fileEmpty"
    | "previewRange";
  values?: Record<string, number>;
}

/** The AI tools a post can be marked as tested with. */
export const WORKS_WITH_TOOLS = [
  "Claude Code",
  "Cursor",
  "GitHub Copilot",
  "Codex",
  "Gemini CLI",
  "Aider",
  "Windsurf",
  "Zed",
] as const;

/** What a post is: a prompt file or a skill. Matches the `kind` check on posted_prompts. */
export const PROMPT_KINDS = ["prompt", "skill"] as const;
export type PromptKind = (typeof PROMPT_KINDS)[number];

export const MAX_FILE_BYTES = 200 * 1024;
export const PREVIEW_LINES = { min: 5, max: 40, default: 12 } as const;

const TEXT_LIMITS = {
  title: { min: 3, max: 80 },
  tagline: { min: 10, max: 140 },
  summary: { min: 20, max: 400 },
} as const;

const LIST_LIMITS = {
  meantFor: { min: 1, max: 6, itemMax: 60 },
  highlights: { min: 1, max: 10, itemMax: 160 },
  usageSteps: { min: 1, max: 8, itemMax: 300 },
} as const;

export type TextField = keyof typeof TEXT_LIMITS;
export type ListField = keyof typeof LIST_LIMITS;
export type PromptPostField =
  TextField | ListField | "kind" | "category" | "install_kind" | "worksWith" | "file" | "previewLineCount";

/** Field order on the form, used to focus the first wrong field on submit. */
export const PROMPT_POST_FIELDS: PromptPostField[] = [
  "kind",
  "title",
  "tagline",
  "summary",
  "category",
  "install_kind",
  "meantFor",
  "highlights",
  "usageSteps",
  "worksWith",
  "file",
  "previewLineCount",
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

export function is_install_kind(value: string): value is InstallKind {
  return (install_kinds as readonly string[]).includes(value);
}

/** The install kind decides where the CLI installs the file, so it has to be chosen (no default). */
export function check_install_kind(value: string): ValidationIssue | null {
  return is_install_kind(value) ? null : { key: "chooseInstallKind" };
}

export function checkWorksWith(values: string[]): ValidationIssue | null {
  const knownTools: readonly string[] = WORKS_WITH_TOOLS;
  const knownValues = values.filter((value) => knownTools.includes(value));
  return knownValues.length > 0 && knownValues.length === values.length ? null : { key: "chooseTool" };
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

export const promptPostSchema = z.strictObject({
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
  install_kind: z
    .string()
    .superRefine(asRefinement(check_install_kind))
    .transform((value) => value as InstallKind),
  meantFor: listSchema("meantFor"),
  highlights: listSchema("highlights"),
  usageSteps: listSchema("usageSteps"),
  worksWith: z.array(z.string()).superRefine(asRefinement(checkWorksWith)),
  file: z
    .custom<File>((value) => value instanceof File, { message: "fileRequired" })
    .superRefine(asRefinement(checkFile)),
  previewLineCount: z
    .string()
    .superRefine(asRefinement(checkPreviewLineCount))
    .transform((value) => Number(value)),
});

export type PromptPostInput = z.output<typeof promptPostSchema>;

/** Longest "what changed" note sent with a revision (it becomes a comment in the review). */
export const REVISION_NOTE_MAX_LENGTH = 1000;

/**
 * A new revision of an existing post: the same fields, a file that may be left out to keep the
 * previous one, and an optional note for the reviewers.
 */
export const prompt_revision_schema = promptPostSchema.omit({ install_kind: true }).extend({
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
