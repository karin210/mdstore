"use server";

import type { PostgrestError } from "@supabase/supabase-js";
import { updateTag } from "next/cache";
import { findPromptBySlug } from "@/data/prompts";
import { slugify } from "@/lib/slugify";
import {
  checkFileContent,
  promptPostSchema,
  type PromptPostField,
  type PromptPostInput,
  type ValidationIssue,
} from "@/lib/validation/promptPost";
import { getSignedInUser } from "@/server/auth/getSignedInUser";
import { logServerError } from "@/server/logServerError";
import { getPostedPromptTag, POSTED_PROMPTS_TAG } from "@/server/prompts/postedPrompts";
import { POSTED_PROMPTS_TABLE } from "@/server/prompts/postedPromptsTable";
import { createServerSupabase } from "@/server/supabase/serverClient";

export type PostPromptResult =
  | { status: "invalid"; fieldErrors: Partial<Record<PromptPostField, ValidationIssue>> }
  | { status: "submitted" }
  | { status: "error"; errorKey: "unauthenticated" | "notConfigured" | "server"; requestId?: string };

const UNIQUE_VIOLATION = "23505";
const RLS_VIOLATION = "42501";

function readText(formData: FormData, field: string): string {
  const value = formData.get(field);
  return typeof value === "string" ? value : "";
}

/** Only the known fields are read from the request; anything else in it is ignored. */
function readSubmission(formData: FormData): Record<PromptPostField, unknown> {
  return {
    kind: readText(formData, "kind"),
    title: readText(formData, "title"),
    tagline: readText(formData, "tagline"),
    summary: readText(formData, "summary"),
    category: readText(formData, "category"),
    authorHandle: readText(formData, "authorHandle"),
    meantFor: readText(formData, "meantFor"),
    highlights: readText(formData, "highlights"),
    usageSteps: readText(formData, "usageSteps"),
    worksWith: formData.getAll("worksWith").filter((value) => typeof value === "string"),
    file: formData.get("file"),
    previewLineCount: readText(formData, "previewLineCount"),
  };
}

/** The file as UTF-8 text, or null when it isn't valid UTF-8 (a binary renamed to .md). */
async function readMarkdown(file: File): Promise<string | null> {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(await file.arrayBuffer());
  } catch {
    return null;
  }
}

/** A URL slug from the title that no catalogue listing uses (posted slugs are unique in the database). */
function getBaseSlug(title: string): string {
  const slug = slugify(title) || "prompt";
  return findPromptBySlug(slug) ? `${slug}-post` : slug;
}

function getFileName(file: File, slug: string): string {
  return `${slugify(file.name.replace(/\.md$/i, "")) || slug}.md`;
}

async function insertPostedPrompt(
  input: PromptPostInput,
  content: string,
  authorId: string,
  slug: string,
): Promise<PostgrestError | null> {
  const supabase = await createServerSupabase();
  if (!supabase) throw new Error("Supabase is not configured");

  // Runs as the signed-in user: row-level security only accepts rows whose author_id is theirs.
  // The keys are the table's snake_case column names.
  // The status is left out on purpose: the column defaults to 'pending', so a new post waits for review.
  const { error } = await supabase.from(POSTED_PROMPTS_TABLE).insert({
    slug,
    kind: input.kind,
    author_id: authorId,
    author_handle: input.authorHandle,
    file_name: getFileName(input.file, slug),
    title: input.title,
    tagline: input.tagline,
    summary: input.summary,
    category: input.category,
    meant_for: input.meantFor,
    highlights: input.highlights,
    usage_steps: input.usageSteps,
    works_with: input.worksWith,
    content,
    preview_line_count: input.previewLineCount,
  });
  return error;
}

/**
 * Submits a prompt for review on behalf of the signed-in user. Every field is validated again here
 * with the same rules as the form; the author comes from the verified session, never the request.
 * The post stays pending until an admin approves it, so there is no page to redirect to yet.
 */
export async function postPrompt(formData: FormData): Promise<PostPromptResult> {
  const user = await getSignedInUser();
  if (!user) return { status: "error", errorKey: "unauthenticated" };

  const parsed = promptPostSchema.safeParse(readSubmission(formData));
  if (!parsed.success) {
    const fieldErrors: Partial<Record<PromptPostField, ValidationIssue>> = {};
    parsed.error.issues.forEach((issue) => {
      const field = issue.path[0] as PromptPostField;
      if (fieldErrors[field]) return;
      const params = "params" in issue ? (issue.params as ValidationIssue["values"]) : undefined;
      fieldErrors[field] = { key: issue.message as ValidationIssue["key"], values: params };
    });
    return { status: "invalid", fieldErrors };
  }

  const content = await readMarkdown(parsed.data.file);
  const contentIssue = content === null ? { key: "fileType" as const } : checkFileContent(content);
  if (content === null || contentIssue) {
    return { status: "invalid", fieldErrors: { file: contentIssue ?? { key: "fileType" } } };
  }

  const baseSlug = getBaseSlug(parsed.data.title);
  let slug = baseSlug;
  try {
    let error = await insertPostedPrompt(parsed.data, content, user.id, slug);
    if (error?.code === UNIQUE_VIOLATION) {
      // Another post already has this title's slug: add a short random suffix and try once more.
      slug = `${baseSlug}-${crypto.randomUUID().slice(0, 6)}`;
      error = await insertPostedPrompt(parsed.data, content, user.id, slug);
    }
    if (error?.code === RLS_VIOLATION) return { status: "error", errorKey: "unauthenticated" };
    if (error) return { status: "error", errorKey: "server", requestId: logServerError("prompts.post", error) };
  } catch (error) {
    if (error instanceof Error && error.message === "Supabase is not configured") {
      return { status: "error", errorKey: "notConfigured" };
    }
    return { status: "error", errorKey: "server", requestId: logServerError("prompts.post", error) };
  }

  updateTag(POSTED_PROMPTS_TAG);
  updateTag(getPostedPromptTag(slug));
  return { status: "submitted" };
}
