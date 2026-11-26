"use server";

import { updateTag } from "next/cache";
import { OUTPUT_EXAMPLES_BUCKET } from "@/lib/outputExamples";
import { logServerError } from "@/server/logServerError";
import { getPostedPromptTag, POSTED_PROMPTS_TAG } from "@/server/prompts/postedPrompts";
import { POSTED_PROMPTS_TABLE } from "@/server/prompts/postedPromptsTable";
import { createServerSupabase } from "@/server/supabase/serverClient";

/** What went wrong, as a key under `account.submissions.delete.errors` in the message catalogue. */
export type DeletePostErrorKey = "unauthenticated" | "forbidden" | "notFound" | "notConfigured" | "server";

export type DeletePostResult =
  { status: "ok" } | { status: "error"; error_key: DeletePostErrorKey; request_id?: string };

/** The SQLSTATE codes delete_post() raises (supabase/migrations/20261126010000_add_delete_post.sql). */
const ERROR_KEYS_BY_CODE: Record<string, DeletePostErrorKey> = {
  MD401: "unauthenticated",
  MD428: "unauthenticated",
  "42501": "unauthenticated",
  MD403: "forbidden",
  MD404: "notFound",
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/**
 * The owner deletes one of their posts for good: the post, its reviews, revisions, comments, co-authors and
 * ratings (the database cascades), then the example images in the owner's own Storage folder. Public pages
 * that listed it are refreshed.
 */
export async function delete_post(post_id: string): Promise<DeletePostResult> {
  if (!UUID_PATTERN.test(post_id)) return { status: "error", error_key: "notFound" };
  const supabase = await createServerSupabase();
  if (!supabase) return { status: "error", error_key: "notConfigured" };

  const { data: claims } = await supabase.auth.getClaims();
  const user_id = claims?.claims.sub;
  if (!user_id) return { status: "error", error_key: "unauthenticated" };

  // The slug names the cache entry to refresh; row-level security hides posts the visitor can't see.
  const { data: post, error: read_error } = await supabase
    .from(POSTED_PROMPTS_TABLE)
    .select("slug")
    .eq("id", post_id)
    .maybeSingle<{ slug: string }>();
  if (read_error) {
    return { status: "error", error_key: "server", request_id: logServerError("prompts.delete.read", read_error) };
  }
  if (!post) return { status: "error", error_key: "notFound" };

  const { data: paths, error } = await supabase.rpc("delete_post", { p_post_id: post_id });
  if (error) {
    const error_key = ERROR_KEYS_BY_CODE[error.code];
    if (error_key) return { status: "error", error_key };
    return { status: "error", error_key: "server", request_id: logServerError("prompts.delete", error) };
  }

  updateTag(POSTED_PROMPTS_TAG);
  updateTag(getPostedPromptTag(post.slug));

  // The bucket only lets users delete from their own folder; images a co-author uploaded stay behind.
  const own_paths = ((paths as string[] | null) ?? []).filter((path) => path.startsWith(`${user_id}/`));
  if (own_paths.length > 0) {
    const { error: storage_error } = await supabase.storage.from(OUTPUT_EXAMPLES_BUCKET).remove(own_paths);
    // The post is already gone; leftover images are only logged.
    if (storage_error) logServerError("prompts.delete.images", storage_error);
  }
  return { status: "ok" };
}
