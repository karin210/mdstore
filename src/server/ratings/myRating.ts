import "server-only";
import { getSignedInUser } from "@/server/auth/getSignedInUser";
import { POSTED_PROMPTS_TABLE, SLUG_PATTERN } from "@/server/prompts/postedPromptsTable";
import { createServerSupabase } from "@/server/supabase/serverClient";

export const PROMPT_RATINGS_TABLE = "prompt_ratings";

/** What the rating form shows the visitor on one post. */
export type MyRating =
  | { state: "signedOut" }
  | { state: "author" }
  /** A reader who may rate; stars null while they haven't. */
  | { state: "reader"; stars: number | null };

/**
 * The visitor's standing on an approved post: signed out, one of its authors, or a reader with
 * their current stars. Null when the slug isn't an approved post (pending posts can't be rated).
 * Reads the session, so it is never cached; render it inside its own <Suspense>.
 * The database checks all of this again when the rating is saved (rate_prompt()).
 */
export async function get_my_rating(slug: string): Promise<MyRating | null> {
  if (!SLUG_PATTERN.test(slug)) return null;
  const supabase = await createServerSupabase();
  if (!supabase) return null;

  const { data: post, error } = await supabase
    .from(POSTED_PROMPTS_TABLE)
    .select("id, post_authors(user_id)")
    .eq("slug", slug)
    .eq("status", "approved")
    .maybeSingle<{ id: string; post_authors: { user_id: string }[] }>();
  if (error) throw new Error(`Couldn't load the rating state of "${slug}": ${error.message}`);
  if (!post) return null;

  const user = await getSignedInUser();
  if (!user) return { state: "signedOut" };
  if (post.post_authors.some((author) => author.user_id === user.id)) return { state: "author" };

  // Row-level security only returns the caller's own rating.
  const { data: rating, error: rating_error } = await supabase
    .from(PROMPT_RATINGS_TABLE)
    .select("stars")
    .eq("post_id", post.id)
    .eq("user_id", user.id)
    .maybeSingle<{ stars: number }>();
  if (rating_error) throw new Error(`Couldn't load your rating of "${slug}": ${rating_error.message}`);
  return { state: "reader", stars: rating?.stars ?? null };
}
