import "server-only";
import type { PromptKind } from "@/data/prompts";
import { SLUG_PATTERN } from "@/server/prompts/postedPromptsTable";
import type { AuthorRole, PostStatus, ReviewStatus } from "@/server/reviews/reviewData";
import { createServerSupabase } from "@/server/supabase/serverClient";

export type SubmissionStatus = PostStatus;

/** One post the signed-in user owns or co-authors, as /my-prompts and /profile list it. */
export interface MySubmission {
  slug: string;
  title: string;
  kind: PromptKind;
  status: SubmissionStatus;
  role: AuthorRole;
  /** The latest review's status: for a live post, whether a proposed change is in review. */
  latest_review_status: ReviewStatus | null;
  created_at: string;
}

interface MembershipRow {
  role: AuthorRole;
  post: {
    slug: string;
    title: string;
    kind: PromptKind;
    status: SubmissionStatus;
    created_at: string;
    prompt_reviews: { number: number; status: ReviewStatus }[];
  } | null;
}

/**
 * The posts the signed-in user is an author of (owner or co-author), newest first. Runs as the
 * visitor, so row-level security applies. Never cached: the list is per user and changes on review.
 * A failed query throws instead of returning an empty list, so an outage never looks like "no posts".
 * Returns an empty list while Supabase isn't configured.
 */
export async function getMySubmissions(userId: string): Promise<MySubmission[]> {
  const supabase = await createServerSupabase();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("post_authors")
    // Named foreign key: prompt_revisions and review_comments also link posts to reviews, which
    // PostgREST would otherwise report as an ambiguous embed.
    .select(
      "role, post:posted_prompts(slug, title, kind, status, created_at, prompt_reviews!prompt_reviews_post_id_fkey(number, status))",
    )
    .eq("user_id", userId)
    .returns<MembershipRow[]>();
  if (error) throw new Error(`Couldn't load your submissions: ${error.message}`);

  return (data ?? [])
    .flatMap((row): MySubmission[] => {
      if (!row.post || !SLUG_PATTERN.test(row.post.slug)) return [];
      const { slug, title, kind, status, created_at, prompt_reviews } = row.post;
      const latest = [...prompt_reviews].sort((first, second) => second.number - first.number)[0];
      return [{ slug, title, kind, status, created_at, role: row.role, latest_review_status: latest?.status ?? null }];
    })
    .sort((first, second) => second.created_at.localeCompare(first.created_at));
}
