import "server-only";
import { createServerSupabase } from "@/server/supabase/serverClient";
import type { ReviewStatus } from "@/server/reviews/reviewData";

export interface QueuedReview {
  number: number;
  status: ReviewStatus;
  created_at: string;
  post: { slug: string; title: string; status: "pending" | "approved" | "rejected" | "withdrawn" };
}

/**
 * The reviews an admin should look at: open ones (waiting for a decision) first, oldest first,
 * then the ones waiting on their authors. Null when the visitor isn't an admin.
 * Uncached: it reads the session.
 */
export async function get_review_queue(): Promise<QueuedReview[] | null> {
  const supabase = await createServerSupabase();
  if (!supabase) return null;

  const { data: is_admin, error: admin_error } = await supabase.rpc("is_admin");
  if (admin_error) throw new Error(`Couldn't check the admin role: ${admin_error.message}`);
  if (is_admin !== true) return null;

  const { data, error } = await supabase
    .from("prompt_reviews")
    .select("number, status, created_at, post:posted_prompts!prompt_reviews_post_id_fkey(slug, title, status)")
    .in("status", ["open", "changes_requested"])
    .order("created_at")
    .returns<QueuedReview[]>();
  if (error) throw new Error(`Couldn't load the review queue: ${error.message}`);
  const reviews = data ?? [];
  return [
    ...reviews.filter((review) => review.status === "open"),
    ...reviews.filter((review) => review.status !== "open"),
  ];
}
