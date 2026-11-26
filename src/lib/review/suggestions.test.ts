import { describe, expect, it } from "vitest";
import { get_suggestion_view, lines_from_text, locate_suggestion, ranges_overlap } from "@/lib/review/suggestions";
import type { Review, ReviewComment, Revision } from "@/lib/review/types";

const review: Review = {
  id: "review-1",
  number: 1,
  status: "open",
  base_revision_id: null,
  opened_by: "user-a",
  created_at: "2026-11-26T10:00:00Z",
  closed_at: null,
};

function make_revision(id: string, number: number, content: string): Revision {
  return {
    id,
    review_id: "review-1",
    number,
    created_by: "user-a",
    created_at: `2026-11-26T1${number}:00:00Z`,
    kind: "prompt",
    file_name: "test.md",
    title: "Title",
    tagline: "Tagline",
    summary: "Summary",
    category: "frontend",
    meant_for: [],
    highlights: [],
    usage_steps: [],
    works_with: [],
    tested_models: [],
    recommended_models: [],
    output_examples: [],
    content,
    preview_line_count: 5,
  };
}

function make_suggestion(overrides: Partial<ReviewComment>): ReviewComment {
  return {
    id: "suggestion",
    review_id: "review-1",
    author_id: "admin",
    body: null,
    revision_id: "rev-1",
    line_number: 2,
    line_side: "new",
    decision: null,
    created_at: "2026-11-26T11:30:00Z",
    suggestion: ["two"],
    line_end: null,
    suggestion_state: "pending",
    applied_suggestion: null,
    applied_revision_id: null,
    resolved_by: null,
    resolved_at: null,
    ...overrides,
  };
}

describe("locate_suggestion", () => {
  it("keeps the same line numbers when the lines still match there", () => {
    expect(locate_suggestion(["b"], 1, ["b", "a", "b"])).toBe(1);
  });

  it("finds lines that moved when they appear once", () => {
    expect(locate_suggestion(["b", "c"], 1, ["x", "a", "b", "c"])).toBe(3);
  });

  it("gives up when the lines changed or appear more than once", () => {
    expect(locate_suggestion(["b"], 2, ["b", "a", "b", "a"])).toBeNull();
    expect(locate_suggestion(["gone"], 1, ["a", "b"])).toBeNull();
  });

  it("doesn't match past the end of the file", () => {
    expect(locate_suggestion(["a", "b"], 2, ["x", "a"])).toBeNull();
  });
});

describe("get_suggestion_view", () => {
  const first = make_revision("rev-1", 1, "one\nline 2\nthree\n");

  it("is pending on the latest revision, targeting its own lines", () => {
    const view = get_suggestion_view(make_suggestion({}), review, [first]);
    expect(view).toMatchObject({
      status: "pending",
      original: ["line 2"],
      proposed: ["two"],
      target: { start: 2, end: 2 },
    });
  });

  it("stays pending on an earlier revision while its lines are unchanged", () => {
    const second = make_revision("rev-2", 2, "intro\none\nline 2\nthree\n");
    const view = get_suggestion_view(make_suggestion({}), review, [first, second]);
    expect(view?.target).toEqual({ start: 3, end: 3 });
  });

  it("is outdated once its lines changed", () => {
    const second = make_revision("rev-2", 2, "one\nline two\nthree\n");
    expect(get_suggestion_view(make_suggestion({}), review, [first, second])?.status).toBe("outdated");
  });

  it("covers a range and reports where an accepted one went", () => {
    const second = make_revision("rev-2", 2, "one\nmerged\n");
    const view = get_suggestion_view(
      make_suggestion({
        line_end: 3,
        suggestion: ["merged"],
        suggestion_state: "accepted",
        applied_revision_id: "rev-2",
      }),
      review,
      [first, second],
    );
    expect(view).toMatchObject({
      status: "accepted",
      original: ["line 2", "three"],
      first_line: 2,
      last_line: 3,
      target: null,
      applied_revision_number: 2,
    });
  });

  it("is null for a plain comment", () => {
    expect(get_suggestion_view(make_suggestion({ suggestion: null }), review, [first])).toBeNull();
  });
});

describe("ranges_overlap", () => {
  it("spots ranges that share a line, in any order", () => {
    expect(
      ranges_overlap([
        { start: 5, end: 6 },
        { start: 3, end: 5 },
      ]),
    ).toBe(true);
    expect(
      ranges_overlap([
        { start: 1, end: 2 },
        { start: 3, end: 3 },
      ]),
    ).toBe(false);
  });
});

describe("lines_from_text", () => {
  it("reads an empty text area as deleting the lines", () => {
    expect(lines_from_text("")).toEqual([]);
    expect(lines_from_text("a\r\n\nb")).toEqual(["a", "", "b"]);
  });
});
