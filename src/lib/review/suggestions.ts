import { get_review_revisions } from "@/lib/review/reviewView";
import type { Review, ReviewComment, Revision } from "@/lib/review/types";
import { splitFileLines } from "@/lib/splitFileLines";

/**
 * Suggested changes: a line comment that carries replacement lines, which the post's authors accept or
 * reject. Applying always works on the review's latest revision; a suggestion made on an earlier revision
 * still applies while its lines are unchanged. The database decides with locate_suggestion() in
 * supabase/migrations/20261126000000_add_line_suggestions.sql; this file mirrors it so the page shows
 * the same status. Keep the two in step. Plain functions, no I/O, so they're unit tested.
 */

/**
 * pending: can be accepted now. outdated: its lines changed in the latest revision, so it can only be
 * rejected. accepted, rejected: answered.
 */
export type SuggestionStatus = "pending" | "outdated" | "accepted" | "rejected";

export interface SuggestionView {
  status: SuggestionStatus;
  /** The lines it replaces, from the revision it was made on. */
  original: string[];
  /** The replacement it proposes; empty deletes the lines. */
  proposed: string[];
  /** What an author applied after editing it; null when taken as written or not accepted. */
  applied: string[] | null;
  first_line: number;
  last_line: number;
  /** Where its lines are in the review's latest revision (first and last line); null unless pending. */
  target: { start: number; end: number } | null;
  /** The number of the revision an accepted suggestion went into. */
  applied_revision_number: number | null;
}

/**
 * Where lines that started at `line_number` in an earlier file are in `file`: the same line numbers when
 * they still match there, else the only place they appear. Null when they changed or appear more than once.
 */
export function locate_suggestion(original: string[], line_number: number, file: string[]): number | null {
  if (original.length === 0) return null;
  const matches_at = (start: number): boolean =>
    start >= 1 &&
    start - 1 + original.length <= file.length &&
    original.every((line, index) => file[start - 1 + index] === line);
  if (matches_at(line_number)) return line_number;
  let found: number | null = null;
  let count = 0;
  for (let start = 1; start + original.length - 1 <= file.length; start += 1) {
    if (matches_at(start)) {
      count += 1;
      found = start;
    }
  }
  return count === 1 ? found : null;
}

/** Whether a comment is a suggested change. */
export function is_suggestion(comment: ReviewComment): boolean {
  return comment.suggestion !== null && comment.revision_id !== null && comment.line_number !== null;
}

/** A suggestion's lines and status against the review's latest revision; null for other comments. */
export function get_suggestion_view(
  comment: ReviewComment,
  review: Review,
  revisions: Revision[],
): SuggestionView | null {
  if (!is_suggestion(comment) || comment.line_number === null || comment.suggestion === null) return null;
  const revision = revisions.find((candidate) => candidate.id === comment.revision_id);
  if (!revision) return null;

  const first_line = comment.line_number;
  const last_line = comment.line_end ?? first_line;
  const original = splitFileLines(revision.content).slice(first_line - 1, last_line);
  const review_revisions = get_review_revisions(review, revisions);
  const latest = review_revisions[review_revisions.length - 1];

  let status: SuggestionStatus = comment.suggestion_state ?? "pending";
  let target: SuggestionView["target"] = null;
  if (status === "pending") {
    const start = latest ? locate_suggestion(original, first_line, splitFileLines(latest.content)) : null;
    if (start === null) status = "outdated";
    else target = { start, end: start + original.length - 1 };
  }

  return {
    status,
    original,
    proposed: comment.suggestion,
    applied: comment.applied_suggestion,
    first_line,
    last_line,
    target,
    applied_revision_number:
      revisions.find((candidate) => candidate.id === comment.applied_revision_id)?.number ?? null,
  };
}

/** Whether any two line ranges share a line (suggestions that can't be applied together). */
export function ranges_overlap(ranges: { start: number; end: number }[]): boolean {
  const sorted = [...ranges].sort((first, second) => first.start - second.start);
  return sorted.some((range, index) => index > 0 && range.start <= sorted[index - 1].end);
}

/** The text of a replacement as typed in a text area: one line per line, empty for none (deletes the lines). */
export function lines_from_text(text: string): string[] {
  return text === "" ? [] : text.replace(/\r\n/g, "\n").split("\n");
}
