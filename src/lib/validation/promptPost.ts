import { z } from "zod";
import { promptCategories, type PromptCategory } from "@/data/prompts";

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
    | "chooseCategory"
    | "chooseTool"
    | "handleFormat"
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

export const MAX_FILE_BYTES = 200 * 1024;
export const PREVIEW_LINES = { min: 5, max: 40, default: 12 } as const;

const TEXT_LIMITS = {
  title: { min: 3, max: 80 },
  tagline: { min: 10, max: 140 },
  summary: { min: 20, max: 400 },
} as const;

const LIST_LIMITS = {
  meant_for: { min: 1, max: 6, item_max: 60 },
  highlights: { min: 1, max: 10, item_max: 160 },
  usage_steps: { min: 1, max: 8, item_max: 300 },
} as const;

export type TextField = keyof typeof TEXT_LIMITS;
export type ListField = keyof typeof LIST_LIMITS;
export type PromptPostField =
  | TextField
  | ListField
  | "category"
  | "author_handle"
  | "works_with"
  | "file"
  | "preview_line_count";

/** Field order on the form, used to focus the first wrong field on submit. */
export const PROMPT_POST_FIELDS: PromptPostField[] = [
  "title",
  "tagline",
  "summary",
  "category",
  "author_handle",
  "meant_for",
  "highlights",
  "usage_steps",
  "works_with",
  "file",
  "preview_line_count",
];

// ---------------------------------------------------------------------------
// Checks (one per kind of field)
// ---------------------------------------------------------------------------

export function check_text(field: TextField, value_raw: string): ValidationIssue | null {
  const value_trimmed = value_raw.trim();
  const limits = TEXT_LIMITS[field];
  if (value_trimmed === "") return { key: "required" };
  if (value_trimmed.length < limits.min) return { key: "tooShort", values: { min: limits.min } };
  if (value_trimmed.length > limits.max) return { key: "tooLong", values: { max: limits.max } };
  return null;
}

/** One item per non-empty line, trimmed. */
export function split_lines(value_raw: string): string[] {
  return value_raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line !== "");
}

export function check_list(field: ListField, value_raw: string): ValidationIssue | null {
  const items = split_lines(value_raw);
  const limits = LIST_LIMITS[field];
  if (items.length === 0) return { key: "required" };
  if (items.length < limits.min) return { key: "tooFewItems", values: { min: limits.min } };
  if (items.length > limits.max) return { key: "tooManyItems", values: { max: limits.max } };
  if (items.some((item) => item.length > limits.item_max)) return { key: "itemTooLong", values: { max: limits.item_max } };
  return null;
}

export function is_prompt_category(value: string): value is PromptCategory {
  return (promptCategories as readonly string[]).includes(value);
}

export function check_category(value: string): ValidationIssue | null {
  return is_prompt_category(value) ? null : { key: "chooseCategory" };
}

export function check_author_handle(value_raw: string): ValidationIssue | null {
  const value_trimmed = value_raw.trim();
  if (value_trimmed === "") return { key: "required" };
  return /^@?[A-Za-z0-9._-]{2,39}$/.test(value_trimmed) ? null : { key: "handleFormat" };
}

export function check_works_with(values: string[]): ValidationIssue | null {
  const known_tools: readonly string[] = WORKS_WITH_TOOLS;
  const known_values = values.filter((value) => known_tools.includes(value));
  return known_values.length > 0 && known_values.length === values.length ? null : { key: "chooseTool" };
}

/** The file's metadata; its text content is checked on the server (see check_file_content). */
export function check_file(file: { name: string; size: number } | null): ValidationIssue | null {
  if (!file || file.name === "") return { key: "fileRequired" };
  if (!/\.md$/i.test(file.name)) return { key: "fileType" };
  if (file.size === 0) return { key: "fileEmpty" };
  if (file.size > MAX_FILE_BYTES) return { key: "fileTooLarge" };
  return null;
}

export function check_file_content(content: string): ValidationIssue | null {
  return content.trim() === "" ? { key: "fileEmpty" } : null;
}

export function check_preview_line_count(value_raw: string): ValidationIssue | null {
  const value_number = Number(value_raw);
  const is_in_range = Number.isInteger(value_number) && value_number >= PREVIEW_LINES.min && value_number <= PREVIEW_LINES.max;
  return value_raw.trim() !== "" && is_in_range
    ? null
    : { key: "previewRange", values: { min: PREVIEW_LINES.min, max: PREVIEW_LINES.max } };
}

// ---------------------------------------------------------------------------
// Server schema (the same checks, as a Zod schema the create action parses with)
// ---------------------------------------------------------------------------

function as_refinement<Value>(check: (value: Value) => ValidationIssue | null) {
  return (value: Value, ctx: z.RefinementCtx): void => {
    const issue = check(value);
    if (issue) ctx.addIssue({ code: "custom", message: issue.key, params: issue.values });
  };
}

const text_schema = (field: TextField) =>
  z
    .string()
    .superRefine(as_refinement((value: string) => check_text(field, value)))
    .transform((value) => value.trim());

const list_schema = (field: ListField) =>
  z
    .string()
    .superRefine(as_refinement((value: string) => check_list(field, value)))
    .transform(split_lines);

export const prompt_post_schema = z.strictObject({
  title: text_schema("title"),
  tagline: text_schema("tagline"),
  summary: text_schema("summary"),
  category: z.string().superRefine(as_refinement(check_category)).transform((value) => value as PromptCategory),
  author_handle: z
    .string()
    .superRefine(as_refinement(check_author_handle))
    .transform((value) => {
      const value_trimmed = value.trim();
      return value_trimmed.startsWith("@") ? value_trimmed : `@${value_trimmed}`;
    }),
  meant_for: list_schema("meant_for"),
  highlights: list_schema("highlights"),
  usage_steps: list_schema("usage_steps"),
  works_with: z.array(z.string()).superRefine(as_refinement(check_works_with)),
  file: z.custom<File>((value) => value instanceof File, { message: "fileRequired" }).superRefine(as_refinement(check_file)),
  preview_line_count: z
    .string()
    .superRefine(as_refinement(check_preview_line_count))
    .transform((value) => Number(value)),
});

export type PromptPostInput = z.output<typeof prompt_post_schema>;
