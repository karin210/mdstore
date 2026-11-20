"use server";

import type { PostgrestError } from "@supabase/supabase-js";
import { updateTag } from "next/cache";
import type { LineSide } from "@/lib/review/types";
import { checkFileContent, prompt_revision_schema } from "@/lib/validation/promptPost";
import { logServerError } from "@/server/logServerError";
import { getPostedPromptTag, POSTED_PROMPTS_TAG } from "@/server/prompts/postedPrompts";
import {
  getFileName,
  readMarkdown,
  readSubmission,
  toFieldErrors,
  type FieldErrors,
} from "@/server/prompts/submission";
import { INVITE_TOKEN_PATTERN } from "@/server/reviews/invites";
import { createServerSupabase } from "@/server/supabase/serverClient";

/** What went wrong, as a key under `review.errors` in the message catalogue. */
export type ReviewErrorKey =
  "unauthenticated" | "forbidden" | "notFound" | "closed" | "invalid" | "usernameRequired" | "notConfigured" | "server";

export type ReviewActionResult<Extra extends object = object> =
  ({ status: "ok" } & Extra) | { status: "error"; error_key: ReviewErrorKey; request_id?: string };

export type PushRevisionResult =
  ReviewActionResult<{ number: number }> | { status: "invalid"; field_errors: FieldErrors; note_too_long: boolean };

/** The SQLSTATE codes the review functions raise (see the migration's "Actions" section). */
const ERROR_KEYS_BY_CODE: Record<string, ReviewErrorKey> = {
  MD401: "unauthenticated",
  MD403: "forbidden",
  MD404: "notFound",
  MD409: "closed",
  MD422: "invalid",
  MD428: "usernameRequired",
  // Postgres' own "permission denied", e.g. a signed-out call to a function only signed-in users may run.
  "42501": "unauthenticated",
};

function to_error(
  context: string,
  error: PostgrestError | unknown,
): { status: "error"; error_key: ReviewErrorKey; request_id?: string } {
  const code = typeof error === "object" && error !== null && "code" in error ? String(error.code) : "";
  const error_key = ERROR_KEYS_BY_CODE[code];
  if (error_key) return { status: "error", error_key };
  return { status: "error", error_key: "server", request_id: logServerError(context, error) };
}

/** Runs one review function as the signed-in visitor (row-level security and its checks apply). */
async function call_function<Value>(
  context: string,
  name: string,
  args: Record<string, unknown>,
): Promise<ReviewActionResult<{ value: Value }>> {
  const supabase = await createServerSupabase();
  if (!supabase) return { status: "error", error_key: "notConfigured" };
  try {
    const { data, error } = await supabase.rpc(name, args);
    if (error) return to_error(context, error);
    return { status: "ok", value: data as Value };
  } catch (error) {
    return to_error(context, error);
  }
}

/** Public pages show approved posts and their bylines from the cache; refresh them after a change. */
function refresh_public_post(slug: string): void {
  updateTag(POSTED_PROMPTS_TAG);
  updateTag(getPostedPromptTag(slug));
}

/**
 * An author pushes a new version of their post. Leaving the file out keeps the latest revision's
 * file. It joins the review in progress, or opens a new one for an approved post.
 */
export async function push_revision(post_id: string, formData: FormData): Promise<PushRevisionResult> {
  const parsed = prompt_revision_schema.safeParse(readSubmission(formData, true));
  if (!parsed.success) {
    const note_too_long = parsed.error.issues.some((issue) => issue.path[0] === "note");
    const field_errors = toFieldErrors(parsed.error.issues.filter((issue) => issue.path[0] !== "note"));
    return { status: "invalid", field_errors, note_too_long };
  }
  const input = parsed.data;

  const supabase = await createServerSupabase();
  if (!supabase) return { status: "error", error_key: "notConfigured" };

  // Without a new file, the latest revision's file carries over (readable by the authors only).
  const { data: latest, error: latest_error } = await supabase
    .from("prompt_revisions")
    // Named foreign key: posted_prompts.live_revision_id links the two tables the other way too.
    .select("file_name, content, posted_prompts!prompt_revisions_post_id_fkey(slug)")
    .eq("post_id", post_id)
    .order("number", { ascending: false })
    .limit(1)
    .maybeSingle<{ file_name: string; content: string; posted_prompts: { slug: string } | null }>();
  if (latest_error) return to_error("reviews.pushRevision", latest_error);
  if (!latest?.posted_prompts) return { status: "error", error_key: "notFound" };
  const slug = latest.posted_prompts.slug;

  let content = latest.content;
  let file_name = latest.file_name;
  if (input.file) {
    const new_content = await readMarkdown(input.file);
    const content_issue = new_content === null ? { key: "fileType" as const } : checkFileContent(new_content);
    if (new_content === null || content_issue) {
      return { status: "invalid", field_errors: { file: content_issue ?? { key: "fileType" } }, note_too_long: false };
    }
    content = new_content;
    file_name = getFileName(input.file, slug);
  }

  const result = await call_function<number>("reviews.pushRevision", "push_revision", {
    p_post_id: post_id,
    p_kind: input.kind,
    p_file_name: file_name,
    p_title: input.title,
    p_tagline: input.tagline,
    p_summary: input.summary,
    p_category: input.category,
    p_meant_for: input.meantFor,
    p_highlights: input.highlights,
    p_usage_steps: input.usageSteps,
    p_works_with: input.worksWith,
    p_content: content,
    p_preview_line_count: input.previewLineCount,
    p_note: input.note || null,
    p_tested_models: input.testedModels.map((model) => model.model_id),
    p_recommended_models: input.testedModels.filter((model) => model.recommended).map((model) => model.model_id),
  });
  return result.status === "ok" ? { status: "ok", number: result.value } : result;
}

export interface CommentInput {
  review_id: string;
  body: string;
  /** Both set for a comment on one line of a revision's file. */
  revision_id?: string;
  line_number?: number;
  /** Which file the line counts in; "new" (the revision's own file) when left out. */
  line_side?: LineSide;
}

export async function add_review_comment(input: CommentInput): Promise<ReviewActionResult> {
  const result = await call_function<string>("reviews.comment", "add_review_comment", {
    p_review_id: input.review_id,
    p_body: input.body,
    p_revision_id: input.revision_id ?? null,
    p_line_number: input.line_number ?? null,
    p_line_side: input.line_side ?? "new",
  });
  return result.status === "ok" ? { status: "ok" } : result;
}

/** An admin approves, requests changes or rejects; approving publishes the latest revision. */
export async function decide_review(
  review_id: string,
  decision: "approved" | "changes_requested" | "rejected",
  body: string,
  slug: string,
): Promise<ReviewActionResult> {
  const result = await call_function<null>("reviews.decide", "decide_review", {
    p_review_id: review_id,
    p_decision: decision,
    p_body: body,
  });
  if (result.status !== "ok") return result;
  if (decision !== "changes_requested") refresh_public_post(slug);
  return { status: "ok" };
}

/** The owner withdraws the review in progress. */
export async function withdraw_review(review_id: string): Promise<ReviewActionResult> {
  const result = await call_function<null>("reviews.withdraw", "withdraw_review", { p_review_id: review_id });
  return result.status === "ok" ? { status: "ok" } : result;
}

export type AddCoauthorResult = ReviewActionResult<{ outcome: "added" | "already_author" | "not_found" }>;

/** The owner adds a co-author by @username. */
export async function add_post_coauthor(post_id: string, username: string, slug: string): Promise<AddCoauthorResult> {
  const result = await call_function<"added" | "already_author" | "not_found">(
    "reviews.addCoauthor",
    "add_post_coauthor",
    { p_post_id: post_id, p_username: username },
  );
  if (result.status !== "ok") return result;
  if (result.value === "added") refresh_public_post(slug);
  return { status: "ok", outcome: result.value };
}

/** The owner removes a co-author, or a co-author leaves the post. */
export async function remove_post_author(post_id: string, user_id: string, slug: string): Promise<ReviewActionResult> {
  const result = await call_function<null>("reviews.removeAuthor", "remove_post_author", {
    p_post_id: post_id,
    p_user_id: user_id,
  });
  if (result.status !== "ok") return result;
  refresh_public_post(slug);
  return { status: "ok" };
}

/** The owner creates a one-time invite link; the token is returned once and only its hash is kept. */
export async function create_post_invite(post_id: string): Promise<ReviewActionResult<{ token: string }>> {
  const result = await call_function<string>("reviews.createInvite", "create_post_invite", { p_post_id: post_id });
  return result.status === "ok" ? { status: "ok", token: result.value } : result;
}

/** The visitor accepts an invite link and joins the post as co-author. */
export async function accept_post_invite(token: string): Promise<ReviewActionResult<{ slug: string }>> {
  if (!INVITE_TOKEN_PATTERN.test(token)) return { status: "error", error_key: "notFound" };
  const result = await call_function<string>("reviews.acceptInvite", "accept_post_invite", { p_token: token });
  if (result.status !== "ok") return result;
  refresh_public_post(result.value);
  return { status: "ok", slug: result.value };
}
