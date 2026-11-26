import "server-only";
import type {
  AuthorRole,
  PostAuthor,
  PostStatus,
  Review,
  ReviewComment,
  ReviewStatus,
  Revision,
} from "@/lib/review/types";
import { PROFILES_TABLE } from "@/server/profiles/profiles";
import { POSTED_PROMPTS_TABLE, SLUG_PATTERN } from "@/server/prompts/postedPromptsTable";
import { createServerSupabase } from "@/server/supabase/serverClient";

export type { AuthorRole, PostStatus, ReviewStatus };

export interface ReviewViewer {
  user_id: string;
  username: string | null;
  is_admin: boolean;
  role: AuthorRole | null;
}

/** Everything /prompts/[slug]/review shows, read as the visitor. */
export interface ReviewPageData {
  post: { id: string; slug: string; title: string; status: PostStatus; live_revision_id: string | null };
  authors: PostAuthor[];
  /** Oldest first. */
  reviews: Review[];
  /** Every revision of the post, oldest first (a review's base can belong to an earlier review). */
  revisions: Revision[];
  /** Every comment and decision of the post, oldest first. */
  comments: ReviewComment[];
  /** @username by user id, for everyone who appears on the page. */
  usernames: Record<string, string>;
  viewer: ReviewViewer;
}

const REVISION_COLUMNS =
  "id, review_id, number, created_by, created_at, kind, file_name, title, tagline, summary, category, meant_for, highlights, usage_steps, works_with, tested_models, recommended_models, output_examples, content, preview_line_count";

const COMMENT_COLUMNS =
  "id, review_id, author_id, body, revision_id, line_number, line_side, decision, created_at, suggestion, line_end, suggestion_state, applied_suggestion, applied_revision_id, resolved_by, resolved_at";

function fail(what: string, error: { message: string }): never {
  throw new Error(`Couldn't load the review's ${what}: ${error.message}`);
}

/**
 * Whether the visitor can open a post's review, and why: "author" (owner or co-author), "admin",
 * or null (not signed in, or neither). For the small bar on public listing pages.
 * Uncached: it reads the session.
 */
export async function get_review_access(slug: string): Promise<"author" | "admin" | null> {
  if (!SLUG_PATTERN.test(slug)) return null;
  const supabase = await createServerSupabase();
  if (!supabase) return null;
  const { data: claims } = await supabase.auth.getClaims();
  const user_id = claims?.claims.sub;
  if (!user_id) return null;

  const { count, error } = await supabase
    .from("post_authors")
    .select("user_id, posted_prompts!inner(slug)", { count: "exact", head: true })
    .eq("user_id", user_id)
    .eq("posted_prompts.slug", slug);
  if (error) throw new Error(`Couldn't check the post's authors: ${error.message}`);
  if ((count ?? 0) > 0) return "author";

  const { data: is_admin, error: admin_error } = await supabase.rpc("is_admin");
  if (admin_error) throw new Error(`Couldn't check the admin role: ${admin_error.message}`);
  return is_admin === true ? "admin" : null;
}

/**
 * The review page of a posted prompt, or null when the visitor may not see it (not signed in, not
 * an author or admin) or the slug is unknown; both answer the same, so private posts don't leak.
 * Uncached: it reads the session, and reviews are private. Failed queries throw.
 */
export async function get_review_page(slug: string): Promise<ReviewPageData | null> {
  if (!SLUG_PATTERN.test(slug)) return null;
  const supabase = await createServerSupabase();
  if (!supabase) return null;
  const { data: claims } = await supabase.auth.getClaims();
  const user_id = claims?.claims.sub;
  if (!user_id) return null;

  const { data: post, error: post_error } = await supabase
    .from(POSTED_PROMPTS_TABLE)
    .select("id, slug, title, status, live_revision_id")
    .eq("slug", slug)
    .maybeSingle<ReviewPageData["post"]>();
  if (post_error) fail("post", post_error);
  if (!post) return null;

  const [authors_result, reviews_result, revisions_result, comments_result, admin_result] = await Promise.all([
    supabase
      .from("post_authors")
      .select("user_id, role, joined_at")
      .eq("post_id", post.id)
      .order("joined_at")
      .returns<{ user_id: string; role: AuthorRole }[]>(),
    supabase
      .from("prompt_reviews")
      .select("id, number, status, base_revision_id, opened_by, created_at, closed_at")
      .eq("post_id", post.id)
      .order("number")
      .returns<Review[]>(),
    supabase
      .from("prompt_revisions")
      .select(REVISION_COLUMNS)
      .eq("post_id", post.id)
      .order("number")
      .returns<Revision[]>(),
    supabase
      .from("review_comments")
      .select(COMMENT_COLUMNS)
      .eq("post_id", post.id)
      .order("created_at")
      .returns<ReviewComment[]>(),
    supabase.rpc("is_admin"),
  ]);
  if (authors_result.error) fail("authors", authors_result.error);
  if (reviews_result.error) fail("reviews", reviews_result.error);
  if (revisions_result.error) fail("revisions", revisions_result.error);
  if (comments_result.error) fail("comments", comments_result.error);
  if (admin_result.error) fail("admin check", admin_result.error);

  const reviews = reviews_result.data ?? [];
  // Row-level security returns no reviews to anyone but the authors and admins.
  if (reviews.length === 0) return null;

  const author_rows = authors_result.data ?? [];
  const revisions = revisions_result.data ?? [];
  const comments = comments_result.data ?? [];
  const user_ids = new Set<string>([user_id]);
  author_rows.forEach((author) => user_ids.add(author.user_id));
  revisions.forEach((revision) => revision.created_by && user_ids.add(revision.created_by));
  comments.forEach((comment) => {
    if (comment.author_id) user_ids.add(comment.author_id);
    if (comment.resolved_by) user_ids.add(comment.resolved_by);
  });
  reviews.forEach((review) => review.opened_by && user_ids.add(review.opened_by));

  const { data: profiles, error: profiles_error } = await supabase
    .from(PROFILES_TABLE)
    .select("user_id, username")
    .in("user_id", [...user_ids])
    .returns<{ user_id: string; username: string }[]>();
  if (profiles_error) fail("usernames", profiles_error);
  const usernames = Object.fromEntries((profiles ?? []).map((profile) => [profile.user_id, profile.username]));

  // The owner first, then co-authors in the order they joined.
  const authors = author_rows
    .map((author) => ({ ...author, username: usernames[author.user_id] ?? "" }))
    .sort((first, second) => Number(second.role === "owner") - Number(first.role === "owner"));

  return {
    post,
    authors,
    reviews,
    revisions,
    comments,
    usernames,
    viewer: {
      user_id,
      username: usernames[user_id] ?? null,
      is_admin: admin_result.data === true,
      role: authors.find((author) => author.user_id === user_id)?.role ?? null,
    },
  };
}
