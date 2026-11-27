"use server";

import type { PostgrestError } from "@supabase/supabase-js";
import { updateTag } from "next/cache";
import { findPromptBySlug } from "@/data/prompts";
import { slugify } from "@/lib/slugify";
import { checkFileContent, PREVIEW_LINES, promptPostSchema, type PromptPostInput } from "@/lib/validation/promptPost";
import { logServerError } from "@/server/logServerError";
import { get_signed_in_profile } from "@/server/profiles/profiles";
import { getPostedPromptTag, POSTED_PROMPTS_TAG } from "@/server/prompts/postedPrompts";
import { can_use_output_examples } from "@/server/prompts/outputExamples";
import { POSTED_PROMPTS_TABLE } from "@/server/prompts/postedPromptsTable";
import {
  getFileName,
  read_coauthors,
  readMarkdown,
  readSubmission,
  toFieldErrors,
  type FieldErrors,
} from "@/server/prompts/submission";
import { createServerSupabase } from "@/server/supabase/serverClient";

export type PostPromptResult =
  | { status: "invalid"; fieldErrors: FieldErrors }
  /** `coauthors_not_added`: named co-authors that couldn't be added (the owner can retry from the review). */
  | { status: "submitted"; slug: string; coauthors_not_added: string[] }
  | {
      status: "error";
      errorKey: "unauthenticated" | "usernameRequired" | "notConfigured" | "server";
      requestId?: string;
    };

const UNIQUE_VIOLATION = "23505";
const FOREIGN_KEY_VIOLATION = "23503";
const RLS_VIOLATION = "42501";

/** A URL slug from the title that no catalogue listing uses (posted slugs are unique in the database). */
function getBaseSlug(title: string): string {
  const slug = slugify(title) || "prompt";
  return findPromptBySlug(slug) ? `${slug}-post` : slug;
}

async function insertPostedPrompt(
  input: PromptPostInput,
  content: string,
  authorId: string,
  username: string,
  slug: string,
): Promise<{ error: PostgrestError | null; post_id: string | null }> {
  const supabase = await createServerSupabase();
  if (!supabase) throw new Error("Supabase is not configured");

  // Runs as the signed-in user: row-level security only accepts rows whose author_id is theirs.
  // The keys are the table's snake_case column names.
  // The status is left out on purpose: the column defaults to 'pending', so a new post waits for
  // review. A trigger makes the poster the owner and opens review 1 with this as revision 1.
  const { data, error } = await supabase
    .from(POSTED_PROMPTS_TABLE)
    .insert({
      slug,
      kind: input.kind,
      author_id: authorId,
      // Kept for older readers of the table; the page's byline comes from post_authors.
      author_handle: `@${username}`,
      file_name: getFileName(input.file, slug),
      title: input.title,
      tagline: input.tagline,
      summary: input.summary,
      category: input.category,
      meant_for: input.meantFor,
      highlights: input.highlights,
      usage_steps: input.usageSteps,
      // What it was tested with is the staff's to add later; a new post starts with none.
      works_with: [],
      tested_models: [],
      recommended_models: [],
      output_examples: input.outputExamples,
      content,
      // Every post is free for now, so the form doesn't ask for a preview length.
      preview_line_count: PREVIEW_LINES.default,
    })
    // The poster can read their own pending post, so the insert can return its id.
    .select("id")
    .single<{ id: string }>();
  return { error, post_id: data?.id ?? null };
}

/**
 * Adds the named co-authors to a post that now exists, through the same database function the review page uses
 * (it checks that the caller owns the post). Returns the usernames that weren't added: unknown ones, and any
 * the database refused. The post stays posted either way.
 */
async function add_coauthors(post_id: string, usernames: string[]): Promise<string[]> {
  const supabase = await createServerSupabase();
  if (!supabase) return usernames;
  const not_added: string[] = [];
  for (const username of usernames) {
    const { data, error } = await supabase.rpc("add_post_coauthor", { p_post_id: post_id, p_username: username });
    if (error) logServerError("prompts.post.coauthor", error);
    // "already_author" is the poster naming themselves: nothing to add, nothing to report.
    if (error || data === "not_found") not_added.push(username);
  }
  return not_added;
}

/**
 * Submits a prompt for review on behalf of the signed-in user. Every field is validated again here
 * with the same rules as the form; the author comes from the verified session, never the request.
 * The post stays pending until an admin approves it; the result carries its slug so the form can
 * link to its review.
 */
export async function postPrompt(formData: FormData): Promise<PostPromptResult> {
  let profile;
  try {
    profile = await get_signed_in_profile();
  } catch (error) {
    return { status: "error", errorKey: "server", requestId: logServerError("prompts.post", error) };
  }
  if (!profile) return { status: "error", errorKey: "unauthenticated" };
  if (!profile.username) return { status: "error", errorKey: "usernameRequired" };

  const parsed = promptPostSchema.safeParse({ ...readSubmission(formData), coauthors: read_coauthors(formData) });
  if (!parsed.success) return { status: "invalid", fieldErrors: toFieldErrors(parsed.error.issues) };

  // The images were uploaded by the browser straight to the user's own Storage folder; only paths arrive here.
  if (!can_use_output_examples(parsed.data.outputExamples, profile.user_id)) {
    return { status: "invalid", fieldErrors: { outputExamples: { key: "imageType" } } };
  }

  const content = await readMarkdown(parsed.data.file);
  const contentIssue = content === null ? { key: "fileType" as const } : checkFileContent(content);
  if (content === null || contentIssue) {
    return { status: "invalid", fieldErrors: { file: contentIssue ?? { key: "fileType" } } };
  }

  const baseSlug = getBaseSlug(parsed.data.title);
  let slug = baseSlug;
  let post_id: string | null;
  try {
    let inserted = await insertPostedPrompt(parsed.data, content, profile.user_id, profile.username, slug);
    if (inserted.error?.code === UNIQUE_VIOLATION) {
      // Another post already has this title's slug: add a short random suffix and try once more.
      slug = `${baseSlug}-${crypto.randomUUID().slice(0, 6)}`;
      inserted = await insertPostedPrompt(parsed.data, content, profile.user_id, profile.username, slug);
    }
    const { error } = inserted;
    post_id = inserted.post_id;
    if (error?.code === RLS_VIOLATION) return { status: "error", errorKey: "unauthenticated" };
    // The owner row references the profile: it disappeared, or never existed.
    if (error?.code === FOREIGN_KEY_VIOLATION) return { status: "error", errorKey: "usernameRequired" };
    if (error) return { status: "error", errorKey: "server", requestId: logServerError("prompts.post", error) };
  } catch (error) {
    if (error instanceof Error && error.message === "Supabase is not configured") {
      return { status: "error", errorKey: "notConfigured" };
    }
    return { status: "error", errorKey: "server", requestId: logServerError("prompts.post", error) };
  }

  const coauthors_not_added = post_id ? await add_coauthors(post_id, parsed.data.coauthors) : parsed.data.coauthors;

  updateTag(POSTED_PROMPTS_TAG);
  updateTag(getPostedPromptTag(slug));
  return { status: "submitted", slug, coauthors_not_added };
}
