import { describe, expect, it } from "vitest";
import { build_timeline, diff_listing_fields, get_base_revision, get_review_revisions } from "@/lib/review/reviewView";
import type { Review, ReviewComment, Revision } from "@/lib/review/types";

function make_revision(overrides: Partial<Revision>): Revision {
  return {
    id: "rev",
    review_id: "review-1",
    number: 1,
    created_by: "user-a",
    created_at: "2026-11-16T10:00:00Z",
    kind: "prompt",
    file_name: "test.md",
    title: "Title",
    tagline: "A tagline long enough",
    summary: "A summary that is long enough.",
    category: "conventions",
    meant_for: ["Web apps"],
    highlights: ["One"],
    usage_steps: ["Drop it in"],
    works_with: ["Cursor"],
    content: "line 1\n",
    preview_line_count: 5,
    ...overrides,
  };
}

function make_review(overrides: Partial<Review>): Review {
  return {
    id: "review-1",
    number: 1,
    status: "open",
    base_revision_id: null,
    opened_by: "user-a",
    created_at: "2026-11-16T10:00:00Z",
    closed_at: null,
    ...overrides,
  };
}

const first_review = make_review({ status: "approved" });
const second_review = make_review({ id: "review-2", number: 2, base_revision_id: "rev-2" });
const revisions = [
  make_revision({ id: "rev-1", number: 1 }),
  make_revision({ id: "rev-2", number: 2, title: "Second" }),
  make_revision({ id: "rev-3", number: 3, review_id: "review-2", title: "Third" }),
  make_revision({ id: "rev-4", number: 4, review_id: "review-2", title: "Fourth" }),
];

describe("get_review_revisions", () => {
  it("keeps the review's own revisions in order", () => {
    expect(get_review_revisions(second_review, [...revisions].reverse()).map((revision) => revision.number)).toEqual([
      3, 4,
    ]);
  });
});

describe("get_base_revision", () => {
  it("compares the first revision of a new post with nothing", () => {
    expect(get_base_revision(revisions[0], first_review, revisions)).toBeNull();
  });

  it("compares a later revision with the previous one of the same review", () => {
    expect(get_base_revision(revisions[1], first_review, revisions)?.id).toBe("rev-1");
    expect(get_base_revision(revisions[3], second_review, revisions)?.id).toBe("rev-3");
  });

  it("compares the first revision of a proposed change with the live version", () => {
    expect(get_base_revision(revisions[2], second_review, revisions)?.id).toBe("rev-2");
  });
});

describe("build_timeline", () => {
  it("orders revisions and comments by time, a revision before its note", () => {
    const comments: ReviewComment[] = [
      {
        id: "note",
        review_id: "review-2",
        author_id: "user-a",
        body: "What changed",
        revision_id: null,
        line_number: null,
        decision: null,
        created_at: "2026-11-16T12:00:00Z",
      },
      {
        id: "other-review",
        review_id: "review-1",
        author_id: "user-a",
        body: "Elsewhere",
        revision_id: null,
        line_number: null,
        decision: null,
        created_at: "2026-11-16T11:00:00Z",
      },
    ];
    const timed_revisions = [
      make_revision({ id: "rev-3", number: 3, review_id: "review-2", created_at: "2026-11-16T12:00:00Z" }),
      make_revision({ id: "rev-4", number: 4, review_id: "review-2", created_at: "2026-11-16T13:00:00Z" }),
    ];
    const timeline = build_timeline(second_review, timed_revisions, comments);
    expect(timeline.map((item) => (item.kind === "revision" ? `r${item.revision.number}` : item.comment.id))).toEqual([
      "r3",
      "note",
      "r4",
    ]);
  });
});

describe("diff_listing_fields", () => {
  it("lists only the fields that changed, lists one item per line", () => {
    const changes = diff_listing_fields(
      revisions[0],
      make_revision({ title: "New title", highlights: ["One", "Two"] }),
    );
    expect(changes).toEqual([
      { field: "title", before: "Title", after: "New title" },
      { field: "highlights", before: "One", after: "One\nTwo" },
    ]);
  });
});
