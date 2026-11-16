import "server-only";
import { slugify } from "@/lib/slugify";
import type { PromptPostField, ValidationIssue } from "@/lib/validation/promptPost";

export type FieldErrors = Partial<Record<PromptPostField, ValidationIssue>>;

function readText(formData: FormData, field: string): string {
  const value = formData.get(field);
  return typeof value === "string" ? value : "";
}

/**
 * Only the known fields are read from the request; anything else in it is ignored.
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
    worksWith: formData.getAll("worksWith").filter((value) => typeof value === "string"),
    file: formData.get("file"),
    previewLineCount: readText(formData, "previewLineCount"),
  };
  // A revision keeps the post's install kind, so only a new post sends it.
  if (with_note) submission.note = readText(formData, "note");
  else submission.install_kind = readText(formData, "install_kind");
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
  return `${slugify(file.name.replace(/\.md$/i, "")) || slug}.md`;
}
