import { ai_models, is_model_id } from "@/data/aiModels";
import type { Review, ReviewComment, Revision } from "@/lib/review/types";

/**
 * What the review page derives from the raw records: which revisions belong to a review, what
 * each revision is compared against, the conversation's order and the listing fields that changed.
 * Plain functions, no I/O, so they're unit tested.
 */

/** The listing fields a revision can change, in the order the "Changes" view lists them. */
export const LISTING_FIELDS = [
  "kind",
  "title",
  "tagline",
  "summary",
  "category",
  "meant_for",
  "highlights",
  "usage_steps",
  "works_with",
  "tested_models",
  "recommended_models",
  "output_examples",
  "preview_line_count",
  "file_name",
] as const;

export type ListingField = (typeof LISTING_FIELDS)[number];

export interface FieldChange {
  field: ListingField;
  /** Lists are shown one item per line; numbers and text as they are. */
  before: string;
  after: string;
}

export type TimelineItem =
  { kind: "revision"; at: string; revision: Revision } | { kind: "comment"; at: string; comment: ReviewComment };

/** The revisions pushed to one review, oldest first. */
export function get_review_revisions(review: Review, revisions: Revision[]): Revision[] {
  return revisions
    .filter((revision) => revision.review_id === review.id)
    .sort((first, second) => first.number - second.number);
}

/**
 * What a revision is compared against: the previous revision of the same review, else the live
 * version the review started from, else nothing (the first revision of a new post).
 */
export function get_base_revision(revision: Revision, review: Review, revisions: Revision[]): Revision | null {
  const earlier = get_review_revisions(review, revisions).filter((candidate) => candidate.number < revision.number);
  if (earlier.length > 0) return earlier[earlier.length - 1];
  return revisions.find((candidate) => candidate.id === review.base_revision_id) ?? null;
}

/**
 * The conversation of one review in time order: pushed revisions, comments and decisions.
 * A revision and the note pushed with it share a timestamp (one transaction); the revision comes first.
 */
export function build_timeline(review: Review, revisions: Revision[], comments: ReviewComment[]): TimelineItem[] {
  const items: TimelineItem[] = [
    ...get_review_revisions(review, revisions).map((revision): TimelineItem => ({
      kind: "revision",
      at: revision.created_at,
      revision,
    })),
    ...comments
      .filter((comment) => comment.review_id === review.id)
      .map((comment): TimelineItem => ({ kind: "comment", at: comment.created_at, comment })),
  ];
  return items.sort((first, second) => {
    const by_time = first.at.localeCompare(second.at);
    if (by_time !== 0) return by_time;
    return Number(first.kind === "comment") - Number(second.kind === "comment");
  });
}

function format_field(field: ListingField, value: Revision[ListingField]): string {
  if (!Array.isArray(value)) return String(value);
  // Examples read as their captions (or the stored file's name when there is none), one per line.
  if (field === "output_examples") {
    return (value as Revision["output_examples"])
      .map((example) => example.caption || example.path.split("/").pop() || example.path)
      .join("\n");
  }
  // Model ids read as the models' names; an id the registry no longer knows stays as it is.
  const is_models = field === "tested_models" || field === "recommended_models";
  return (value as string[]).map((item) => (is_models && is_model_id(item) ? ai_models[item].name : item)).join("\n");
}

/** The listing fields whose value differs between two revisions. */
export function diff_listing_fields(base: Revision, revision: Revision): FieldChange[] {
  return LISTING_FIELDS.flatMap((field): FieldChange[] => {
    const before = format_field(field, base[field]);
    const after = format_field(field, revision[field]);
    return before === after ? [] : [{ field, before, after }];
  });
}
