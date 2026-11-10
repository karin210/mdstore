"use server";

import type { PostgrestError } from "@supabase/supabase-js";
import { hasLocale } from "next-intl";
import { updateTag } from "next/cache";
import { findPromptBySlug } from "@/data/prompts";
import { redirect } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { slugify } from "@/lib/slugify";
import {
  check_file_content,
  prompt_post_schema,
  type PromptPostField,
  type PromptPostInput,
  type ValidationIssue,
} from "@/lib/validation/promptPost";
import { get_signed_in_user } from "@/server/auth/getSignedInUser";
import { log_server_error } from "@/server/logServerError";
import { get_posted_prompt_tag, POSTED_PROMPTS_TAG } from "@/server/prompts/postedPrompts";
import { POSTED_PROMPTS_TABLE } from "@/server/prompts/postedPromptsTable";
import { create_server_supabase } from "@/server/supabase/serverClient";

export type PostPromptResult =
  | { status: "invalid"; field_errors: Partial<Record<PromptPostField, ValidationIssue>> }
  | { status: "error"; error_key: "unauthenticated" | "notConfigured" | "server"; request_id?: string };

const UNIQUE_VIOLATION = "23505";
const RLS_VIOLATION = "42501";

function read_text(form_data: FormData, field: string): string {
  const value = form_data.get(field);
  return typeof value === "string" ? value : "";
}

/** Only the known fields are read from the request; anything else in it is ignored. */
function read_submission(form_data: FormData): Record<PromptPostField, unknown> {
  return {
    title: read_text(form_data, "title"),
    tagline: read_text(form_data, "tagline"),
    summary: read_text(form_data, "summary"),
    category: read_text(form_data, "category"),
    author_handle: read_text(form_data, "author_handle"),
    meant_for: read_text(form_data, "meant_for"),
    highlights: read_text(form_data, "highlights"),
    usage_steps: read_text(form_data, "usage_steps"),
    works_with: form_data.getAll("works_with").filter((value) => typeof value === "string"),
    file: form_data.get("file"),
    preview_line_count: read_text(form_data, "preview_line_count"),
  };
}

/** The file as UTF-8 text, or null when it isn't valid UTF-8 (a binary renamed to .md). */
async function read_markdown(file: File): Promise<string | null> {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(await file.arrayBuffer());
  } catch {
    return null;
  }
}

/** A URL slug from the title that no catalogue listing uses (posted slugs are unique in the database). */
function get_base_slug(title: string): string {
  const slug = slugify(title) || "prompt";
  return findPromptBySlug(slug) ? `${slug}-post` : slug;
}

function get_file_name(file: File, slug: string): string {
  return `${slugify(file.name.replace(/\.md$/i, "")) || slug}.md`;
}

async function insert_posted_prompt(
  input: PromptPostInput,
  content: string,
  author_id: string,
  slug: string,
): Promise<PostgrestError | null> {
  const supabase = await create_server_supabase();
  if (!supabase) throw new Error("Supabase is not configured");

  // Runs as the signed-in user: row-level security only accepts rows whose author_id is theirs.
  const { error } = await supabase.from(POSTED_PROMPTS_TABLE).insert({
    slug,
    author_id,
    author_handle: input.author_handle,
    file_name: get_file_name(input.file, slug),
    title: input.title,
    tagline: input.tagline,
    summary: input.summary,
    category: input.category,
    meant_for: input.meant_for,
    highlights: input.highlights,
    usage_steps: input.usage_steps,
    works_with: input.works_with,
    content,
    preview_line_count: input.preview_line_count,
  });
  return error;
}

/**
 * Posts a prompt for the signed-in user and opens its page. Every field is validated again here
 * with the same rules as the form; the author comes from the verified session, never the request.
 */
export async function post_prompt(form_data: FormData): Promise<PostPromptResult> {
  const requested_locale = read_text(form_data, "locale");
  const locale = hasLocale(routing.locales, requested_locale) ? requested_locale : routing.defaultLocale;

  const user = await get_signed_in_user();
  if (!user) return { status: "error", error_key: "unauthenticated" };

  const parsed = prompt_post_schema.safeParse(read_submission(form_data));
  if (!parsed.success) {
    const field_errors: Partial<Record<PromptPostField, ValidationIssue>> = {};
    parsed.error.issues.forEach((issue) => {
      const field = issue.path[0] as PromptPostField;
      if (field_errors[field]) return;
      const params = "params" in issue ? (issue.params as ValidationIssue["values"]) : undefined;
      field_errors[field] = { key: issue.message as ValidationIssue["key"], values: params };
    });
    return { status: "invalid", field_errors };
  }

  const content = await read_markdown(parsed.data.file);
  const content_issue = content === null ? { key: "fileType" as const } : check_file_content(content);
  if (content === null || content_issue) {
    return { status: "invalid", field_errors: { file: content_issue ?? { key: "fileType" } } };
  }

  const base_slug = get_base_slug(parsed.data.title);
  let slug = base_slug;
  try {
    let error = await insert_posted_prompt(parsed.data, content, user.id, slug);
    if (error?.code === UNIQUE_VIOLATION) {
      // Another post already has this title's slug: add a short random suffix and try once more.
      slug = `${base_slug}-${crypto.randomUUID().slice(0, 6)}`;
      error = await insert_posted_prompt(parsed.data, content, user.id, slug);
    }
    if (error?.code === RLS_VIOLATION) return { status: "error", error_key: "unauthenticated" };
    if (error) return { status: "error", error_key: "server", request_id: log_server_error("prompts.post", error) };
  } catch (error) {
    if (error instanceof Error && error.message === "Supabase is not configured") {
      return { status: "error", error_key: "notConfigured" };
    }
    return { status: "error", error_key: "server", request_id: log_server_error("prompts.post", error) };
  }

  updateTag(POSTED_PROMPTS_TAG);
  updateTag(get_posted_prompt_tag(slug));
  redirect({ href: `/prompts/${slug}`, locale });
  return { status: "error", error_key: "server" }; // unreachable: redirect() throws
}
