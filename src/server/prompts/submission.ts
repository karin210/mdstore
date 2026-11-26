import "server-only";
import { get_post_file_name } from "@/lib/postFileName";
import type { PromptPostField, ValidationIssue } from "@/lib/validation/promptPost";

export type FieldErrors = Partial<Record<PromptPostField, ValidationIssue>>;

function read_list(formData: FormData, field: string): string[] {
  return formData.getAll(field).filter((value) => typeof value === "string");
}

/** The usernames a new post names as co-authors (one `coauthor` entry each). */
export function read_coauthors(formData: FormData): string[] {
  return read_list(formData, "coauthor");
}

/** The output examples the form sends as two parallel lists: the storage paths, and a caption for each. */
function read_output_examples(formData: FormData): { path: string; caption: string }[] {
  const captions = read_list(formData, "outputExampleCaption");
  return read_list(formData, "outputExample").map((path, index) => ({ path, caption: captions[index] ?? "" }));
}

function readText(formData: FormData, field: string): string {
  const value = formData.get(field);
  return typeof value === "string" ? value : "";
}

/**
 * Only the known fields are read from the request; anything else in it is ignored, including the tools and
 * models a prompt was tested with: the staff provide those, not the authors.
 * `with_note` adds the optional "what changed" note of a revision.
 */
export function readSubmission(formData: FormData, with_note = false): Record<string, unknown> {
  const submission: Record<string, unknown> = {
    kind: readText(formData, "kind"),
    title: readText(formData, "title"),
    tagline: readText(formData, "tagline"),
    summary: readText(formData, "summary"),
    category: readText(formData, "category"),
    meantFor: readText(formData, "meantFor"),
    highlights: readText(formData, "highlights"),
    usageSteps: readText(formData, "usageSteps"),
    file: formData.get("file"),
    previewLineCount: readText(formData, "previewLineCount"),
    outputExamples: read_output_examples(formData),
  };
  if (with_note) submission.note = readText(formData, "note");
  return submission;
}

/** Zod issues as one guidance per field (the first one), the way the forms show them. */
export function toFieldErrors(issues: { path: PropertyKey[]; message: string; params?: unknown }[]): FieldErrors {
  const fieldErrors: FieldErrors = {};
  issues.forEach((issue) => {
    const field = issue.path[0] as PromptPostField;
    if (fieldErrors[field]) return;
    const params = "params" in issue ? (issue.params as ValidationIssue["values"]) : undefined;
    fieldErrors[field] = { key: issue.message as ValidationIssue["key"], values: params };
  });
  return fieldErrors;
}

/** The file as UTF-8 text, or null when it isn't valid UTF-8 (a binary renamed to .md). */
export async function readMarkdown(file: File): Promise<string | null> {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(await file.arrayBuffer());
  } catch {
    return null;
  }
}

export function getFileName(file: File, slug: string): string {
  return get_post_file_name(file.name, slug);
}
