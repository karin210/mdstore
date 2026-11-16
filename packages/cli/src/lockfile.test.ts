import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  empty_lockfile,
  lockfile_name,
  LockfileError,
  parse_lockfile,
  read_lockfile,
  serialize_lockfile,
  write_lockfile,
  type Lockfile,
} from "./lockfile.js";

const hash = "a".repeat(64);

const sample: Lockfile = {
  version: 1,
  prompts: {
    modals: { version: 2, sha256: hash, path: ".claude/agents/modals.md", kind: "agent", tool: "claude" },
    global: {
      version: 1,
      sha256: hash,
      path: ".mdstore/global.md",
      kind: "instructions",
      tool: "claude",
      reference: "CLAUDE.md",
    },
  },
};

describe("serialize_lockfile / parse_lockfile", () => {
  it("round-trips, with slugs sorted and a final newline", () => {
    const text = serialize_lockfile(sample);
    expect(text.endsWith("}\n")).toBe(true);
    expect(text.indexOf('"global"')).toBeLessThan(text.indexOf('"modals"'));
    expect(parse_lockfile(text)).toEqual(sample);
  });

  it.each([
    ["not JSON", "{"],
    ["another format version", JSON.stringify({ version: 2, prompts: {} })],
    ["no prompts object", JSON.stringify({ version: 1 })],
    ["a bad slug", JSON.stringify({ version: 1, prompts: { "../x": sample.prompts.global } })],
    ["a bad hash", JSON.stringify({ version: 1, prompts: { a: { ...sample.prompts.global, sha256: "nope" } } })],
    ["version 0", JSON.stringify({ version: 1, prompts: { a: { ...sample.prompts.global, version: 0 } } })],
    ["an unknown kind", JSON.stringify({ version: 1, prompts: { a: { ...sample.prompts.global, kind: "skill" } } })],
    ["an unknown tool", JSON.stringify({ version: 1, prompts: { a: { ...sample.prompts.global, tool: "vim" } } })],
    ["a path outside", JSON.stringify({ version: 1, prompts: { a: { ...sample.prompts.global, path: "../a.md" } } })],
    ["an absolute path", JSON.stringify({ version: 1, prompts: { a: { ...sample.prompts.global, path: "/etc/a" } } })],
    [
      "a reference outside",
      JSON.stringify({ version: 1, prompts: { a: { ...sample.prompts.global, reference: "../CLAUDE.md" } } }),
    ],
  ])("rejects %s", (_label, text) => {
    expect(() => parse_lockfile(text)).toThrow(LockfileError);
  });
});

describe("read_lockfile / write_lockfile", () => {
  let root: string;
  beforeEach(() => {
    root = mkdtempSync(path.join(tmpdir(), "mdstore-lock-"));
  });
  afterEach(() => rmSync(root, { recursive: true, force: true }));

  it("reads an empty lockfile when there is none", async () => {
    expect(await read_lockfile(root)).toEqual(empty_lockfile());
  });

  it("writes mdstore.lock.json at the root and reads it back", async () => {
    await write_lockfile(root, sample);
    expect(JSON.parse(readFileSync(path.join(root, lockfile_name), "utf8")).version).toBe(1);
    expect(await read_lockfile(root)).toEqual(sample);
  });

  it("reports a corrupt lockfile instead of starting over", async () => {
    writeFileSync(path.join(root, lockfile_name), "not json");
    await expect(read_lockfile(root)).rejects.toThrow(LockfileError);
  });
});
