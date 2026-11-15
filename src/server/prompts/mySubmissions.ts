import "server-only";
import { POSTED_PROMPTS_TABLE, SLUG_PATTERN } from "@/server/prompts/postedPromptsTable";
import { createServerSupabase } from "@/server/supabase/serverClient";

export type SubmissionStatus = "pending" | "approved" | "rejected";

/** One of the author's own posts, as the "my submissions" list shows it. */
export interface MySubmission {
  slug: string;
  title: string;
  kind: "prompt" | "skill";
  status: SubmissionStatus;
  review_note: string | null;
}

const SUBMISSION_COLUMNS = "slug, title, kind, status, review_note";

/**
 * The signed-in author's own posts, newest first. Runs as the visitor, so row-level security applies,
 * and filters on author_id as well. Never cached: the list is per user and changes on review.
 * A failed query throws instead of returning an empty list, so an outage never looks like "no posts".
 * Returns an empty list while Supabase isn't configured.
 */
export async function getMySubmissions(userId: string): Promise<MySubmission[]> {
  const supabase = await createServerSupabase();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from(POSTED_PROMPTS_TABLE)
    .select(SUBMISSION_COLUMNS)
    .eq("author_id", userId)
    .order("created_at", { ascending: false })
    .returns<MySubmission[]>();
  if (error) throw new Error(`Couldn't load your submissions: ${error.message}`);
  return (data ?? []).filter((row) => SLUG_PATTERN.test(row.slug));
}
