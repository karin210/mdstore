import { describe, expect, it } from "vitest";
import { count_hidden_after, diff_lines, group_into_hunks, type DiffLine } from "@/lib/review/diffLines";

/** A compact view of a diff: " a", "-b", "+c". */
function render(lines: DiffLine[]): string[] {
  return lines.map((line) => ({ same: " ", removed: "-", added: "+" })[line.kind] + line.text);
}

/** Applies a diff to the old lines, which must give the new ones back. */
function apply(lines: DiffLine[]): { old_lines: string[]; new_lines: string[] } {
  return {
    old_lines: lines.filter((line) => line.kind !== "added").map((line) => line.text),
    new_lines: lines.filter((line) => line.kind !== "removed").map((line) => line.text),
  };
}

describe("diff_lines", () => {
  it("marks everything unchanged for identical files", () => {
    expect(render(diff_lines(["a", "b"], ["a", "b"]))).toEqual([" a", " b"]);
  });

  it("finds one changed line in the middle", () => {
    expect(render(diff_lines(["a", "b", "c"], ["a", "x", "c"]))).toEqual([" a", "-b", "+x", " c"]);
  });

  it("handles additions at the start and removals at the end", () => {
    expect(render(diff_lines(["a", "b", "c"], ["z", "a", "b"]))).toEqual(["+z", " a", " b", "-c"]);
  });

  it("handles an empty side", () => {
    expect(render(diff_lines([], ["a"]))).toEqual(["+a"]);
    expect(render(diff_lines(["a"], []))).toEqual(["-a"]);
  });

  it("finds a shortest edit script", () => {
    const lines = diff_lines(["a", "b", "c", "a", "b", "b", "a"], ["c", "b", "a", "b", "a", "c"]);
    expect(lines.filter((line) => line.kind !== "same")).toHaveLength(5);
  });

  it("numbers lines in both versions", () => {
    const [first, removed, added, last] = diff_lines(["a", "b", "c"], ["a", "x", "c"]);
    expect(first).toEqual({ kind: "same", text: "a", old_number: 1, new_number: 1 });
    expect(removed).toEqual({ kind: "removed", text: "b", old_number: 2 });
    expect(added).toEqual({ kind: "added", text: "x", new_number: 2 });
    expect(last).toEqual({ kind: "same", text: "c", old_number: 3, new_number: 3 });
  });

  it("always rebuilds both versions, on random files", () => {
    // Deterministic pseudo-random lines from a small alphabet, so many lines repeat.
    let seed = 7;
    const next = (): number => {
      seed = (seed * 1103515245 + 12345) % 2147483648;
      return seed;
    };
    for (let round = 0; round < 50; round++) {
      const old_lines = Array.from({ length: next() % 30 }, () => "abcde"[next() % 5]);
      const new_lines = Array.from({ length: next() % 30 }, () => "abcde"[next() % 5]);
      expect(apply(diff_lines(old_lines, new_lines))).toEqual({ old_lines, new_lines });
    }
  });
});

describe("group_into_hunks", () => {
  const old_lines = Array.from({ length: 20 }, (_, index) => `line ${index + 1}`);

  it("returns no hunks when nothing changed", () => {
    expect(group_into_hunks(diff_lines(old_lines, old_lines))).toEqual([]);
  });

  it("keeps a few unchanged lines around each change and counts the skipped ones", () => {
    const new_lines = old_lines.map((line, index) => (index === 9 ? "changed" : line));
    const lines = diff_lines(old_lines, new_lines);
    const hunks = group_into_hunks(lines, 2);
    expect(hunks).toHaveLength(1);
    expect(hunks[0].hidden_before).toBe(7);
    expect(render(hunks[0].lines)).toEqual([" line 8", " line 9", "-line 10", "+changed", " line 11", " line 12"]);
    expect(count_hidden_after(lines, hunks)).toBe(8);
  });

  it("splits changes that are far apart and merges close ones", () => {
    const new_lines = old_lines.map((line, index) => ([1, 3, 17].includes(index) ? `${line}!` : line));
    const hunks = group_into_hunks(diff_lines(old_lines, new_lines), 2);
    expect(hunks).toHaveLength(2);
    // Hunk 1 ends at line 6 (change on line 4 + 2), hunk 2 starts at line 16: lines 7 to 15 are hidden.
    expect(hunks[1].hidden_before).toBe(9);
  });
});
