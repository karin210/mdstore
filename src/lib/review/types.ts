import type { PromptCategory } from "@/data/prompts";
import type { PromptKind } from "@/lib/validation/promptPost";

/**
 * The review workflow's records, as the review page reads them. Keys are the database's
 * snake_case column names. Shared by server code and client components.
 */

export type ReviewStatus = "open" | "changes_requested" | "approved" | "rejected" | "withdrawn";
export type PostStatus = "pending" | "approved" | "rejected" | "withdrawn";
export type AuthorRole = "owner" | "coauthor";
export type ReviewDecision = "approved" | "changes_requested" | "rejected" | "withdrawn";

export type SuggestionState = "pending" | "accepted" | "rejected";

export const ACTIVE_REVIEW_STATUSES: readonly ReviewStatus[] = ["open", "changes_requested"];

/** A review in progress: authors can push to it and comment, admins can decide. */
export function is_review_active(status: ReviewStatus): boolean {
  return ACTIVE_REVIEW_STATUSES.includes(status);
}

export interface PostAuthor {
  user_id: string;
  username: string;
  role: AuthorRole;
}

/** One version of a listing an author pushed. */
export interface Revision {
  id: string;
  review_id: string;
  number: number;
  created_by: string | null;
  created_at: string;
  kind: PromptKind;
  file_name: string;
  title: string;
  tagline: string;
  summary: string;
  category: PromptCategory;
  meant_for: string[];
  highlights: string[];
  usage_steps: string[];
  works_with: string[];
  tested_models: string[];
  recommended_models: string[];
  /** Screenshots of the output: paths in the `output-examples` bucket with captions. */
  output_examples: { path: string; caption: string }[];
  content: string;
  preview_line_count: number;
}

export interface Review {
  id: string;
  number: number;
  status: ReviewStatus;
  /** The live revision this review proposes to replace; null for a post's first review. */
  base_revision_id: string | null;
  opened_by: string | null;
  created_at: string;
  closed_at: string | null;
}

/**
 * Which file a line comment's line_number counts in: the revision's own file ("new", the File tab
 * and added or unchanged lines of the Changes tab), or the file it is compared with ("old", the
 * removed lines of the Changes tab; see get_base_revision).
 */
export type LineSide = "new" | "old";

export interface ReviewComment {
  id: string;
  review_id: string;
  author_id: string | null;
  body: string | null;
  revision_id: string | null;
  line_number: number | null;
  /** "new" for comments on the whole review too (the database default). */
  line_side: LineSide;
  decision: ReviewDecision | null;
  created_at: string;
  /**
   * Set on a suggested change: the lines that replace line_number to line_end (or line_number alone) of
   * the revision's own file; empty deletes them. See src/lib/review/suggestions.ts.
   */
  suggestion: string[] | null;
  /** The last line a suggestion replaces, when it spans several; null for one line. */
  line_end: number | null;
  suggestion_state: SuggestionState | null;
  /** What was applied when an author edited the suggestion before accepting it. */
  applied_suggestion: string[] | null;
  /** The revision an accepted suggestion went into. */
  applied_revision_id: string | null;
  resolved_by: string | null;
  resolved_at: string | null;
}
