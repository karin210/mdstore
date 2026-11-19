/**
 * Line diff between two versions of a file, for the "Changes" view of a review. Uses Myers'
 * algorithm (the one `git diff` uses by default): the shortest list of removed and added lines.
 * Plain TypeScript, no dependency; lines are compared exactly (whitespace counts).
 */

export type DiffLine =
  | { kind: "same"; text: string; old_number: number; new_number: number }
  | { kind: "removed"; text: string; old_number: number }
  | { kind: "added"; text: string; new_number: number };

export interface DiffHunk {
  /** Unchanged lines skipped between the previous hunk (or the start of the file) and this one. */
  hidden_before: number;
  lines: DiffLine[];
}

type Edit = "same" | "removed" | "added";

/**
 * Beyond this many differences the exact diff gets slow and memory-hungry; the two middles are
 * then shown as fully removed and fully added, which is still correct, just less precise.
 */
const MAX_EDIT_DISTANCE = 4000;

/** v[k] of one round of the search, kept for the backtrack (only the diagonals it can read). */
interface Snapshot {
  first_k: number;
  values: Int32Array;
}

function read_snapshot(snapshot: Snapshot, k: number): number {
  return snapshot.values[k - snapshot.first_k];
}

/** The edit script turning `a` into `b`, or null when it needs more than MAX_EDIT_DISTANCE edits. */
function find_edits(a: string[], b: string[]): Edit[] | null {
  const n = a.length;
  const m = b.length;
  const max_distance = Math.min(n + m, MAX_EDIT_DISTANCE);
  const offset = max_distance + 1;
  // v[k + offset]: the furthest x reached on diagonal k (k = x - y).
  const v = new Int32Array(2 * offset + 1);
  const trace: Snapshot[] = [];

  for (let distance = 0; distance <= max_distance; distance++) {
    const first_k = -distance - 1;
    trace.push({ first_k, values: v.slice(first_k + offset, distance + 2 + offset) });

    for (let k = -distance; k <= distance; k += 2) {
      const goes_down = k === -distance || (k !== distance && v[k - 1 + offset] < v[k + 1 + offset]);
      let x = goes_down ? v[k + 1 + offset] : v[k - 1 + offset] + 1;
      let y = x - k;
      while (x < n && y < m && a[x] === b[y]) {
        x++;
        y++;
      }
      v[k + offset] = x;
      if (x >= n && y >= m) return backtrack(trace, n, m);
    }
  }
  return null;
}

function backtrack(trace: Snapshot[], n: number, m: number): Edit[] {
  const edits: Edit[] = [];
  let x = n;
  let y = m;

  for (let distance = trace.length - 1; distance > 0; distance--) {
    const snapshot = trace[distance];
    const k = x - y;
    const goes_down =
      k === -distance || (k !== distance && read_snapshot(snapshot, k - 1) < read_snapshot(snapshot, k + 1));
    const previous_k = goes_down ? k + 1 : k - 1;
    const previous_x = read_snapshot(snapshot, previous_k);
    const previous_y = previous_x - previous_k;

    while (x > previous_x && y > previous_y) {
      edits.push("same");
      x--;
      y--;
    }
    edits.push(goes_down ? "added" : "removed");
    x = previous_x;
    y = previous_y;
  }
  while (x > 0 && y > 0) {
    edits.push("same");
    x--;
    y--;
  }
  return edits.reverse();
}

/** Every line of both versions, in reading order, marked as unchanged, removed or added. */
export function diff_lines(old_lines: string[], new_lines: string[]): DiffLine[] {
  // The common start and end are cheap to skip and are usually most of the file.
  let prefix = 0;
  while (prefix < old_lines.length && prefix < new_lines.length && old_lines[prefix] === new_lines[prefix]) prefix++;
  let old_end = old_lines.length;
  let new_end = new_lines.length;
  while (old_end > prefix && new_end > prefix && old_lines[old_end - 1] === new_lines[new_end - 1]) {
    old_end--;
    new_end--;
  }

  const old_middle = old_lines.slice(prefix, old_end);
  const new_middle = new_lines.slice(prefix, new_end);
  const middle_edits: Edit[] = find_edits(old_middle, new_middle) ?? [
    ...old_middle.map((): Edit => "removed"),
    ...new_middle.map((): Edit => "added"),
  ];
  const edits: Edit[] = [
    ...Array.from({ length: prefix }, (): Edit => "same"),
    ...middle_edits,
    ...Array.from({ length: old_lines.length - old_end }, (): Edit => "same"),
  ];

  const result: DiffLine[] = [];
  let old_index = 0;
  let new_index = 0;
  for (const edit of edits) {
    if (edit === "same") {
      result.push({ kind: "same", text: new_lines[new_index], old_number: old_index + 1, new_number: new_index + 1 });
      old_index++;
      new_index++;
    } else if (edit === "removed") {
      result.push({ kind: "removed", text: old_lines[old_index], old_number: old_index + 1 });
      old_index++;
    } else {
      result.push({ kind: "added", text: new_lines[new_index], new_number: new_index + 1 });
      new_index++;
    }
  }
  return result;
}

/**
 * The changed lines with `context` unchanged lines around each change, like a unified diff.
 * Changes closer than twice the context share one hunk. No hunks when nothing changed.
 * `is_pinned` marks unchanged lines to show anyway (with their context), such as lines that carry
 * review comments, so no comment is hidden in a collapsed stretch.
 */
export function group_into_hunks(
  lines: DiffLine[],
  context = 3,
  is_pinned: (line: DiffLine) => boolean = () => false,
): DiffHunk[] {
  const shown = new Array<boolean>(lines.length).fill(false);
  lines.forEach((line, index) => {
    if (line.kind === "same" && !is_pinned(line)) return;
    for (let near = Math.max(0, index - context); near <= Math.min(lines.length - 1, index + context); near++) {
      shown[near] = true;
    }
  });

  const hunks: DiffHunk[] = [];
  let hidden = 0;
  let current: DiffHunk | null = null;
  lines.forEach((line, index) => {
    if (!shown[index]) {
      hidden++;
      current = null;
      return;
    }
    if (!current) {
      current = { hidden_before: hidden, lines: [] };
      hunks.push(current);
      hidden = 0;
    }
    current.lines.push(line);
  });
  return hunks;
}

/** Unchanged lines after the last hunk, for the "N unchanged lines" note at the end. */
export function count_hidden_after(lines: DiffLine[], hunks: DiffHunk[]): number {
  const shown_count = hunks.reduce((total, hunk) => total + hunk.hidden_before + hunk.lines.length, 0);
  return lines.length - shown_count;
}
