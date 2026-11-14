import { mkdirSync, mkdtempSync, rmSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { assert_real_path_inside, resolve_inside_root, to_posix_relative, UnsafePathError } from "./paths.js";

const root = path.resolve("/project");

describe("resolve_inside_root", () => {
  it.each(["CLAUDE.md", ".cursor/rules/a.mdc", "a/../b.md", "docs\\rules.md"])("accepts %s", (relative) => {
    const absolute = resolve_inside_root(root, relative);
    expect(path.relative(root, absolute).startsWith("..")).toBe(false);
  });

  it.each([
    "../outside.md",
    "a/../../outside.md",
    "/etc/passwd",
    "C:\\Windows\\a.md",
    "\\\\server\\share\\a.md",
    "",
    ".",
    "a/..",
  ])("refuses %j", (relative) => {
    expect(() => resolve_inside_root(root, relative)).toThrow(UnsafePathError);
  });
});

describe("to_posix_relative", () => {
  it("uses forward slashes", () => {
    expect(to_posix_relative(root, path.join(root, ".claude", "agents", "a.md"))).toBe(".claude/agents/a.md");
  });
});

describe("assert_real_path_inside", () => {
  let base: string;
  let project: string;
  let outside: string;
  beforeEach(() => {
    base = mkdtempSync(path.join(tmpdir(), "mdstore-paths-"));
    project = path.join(base, "project");
    outside = path.join(base, "outside");
    mkdirSync(project);
    mkdirSync(outside);
  });
  afterEach(() => rmSync(base, { recursive: true, force: true }));

  it("accepts a new file in a folder that doesn't exist yet", async () => {
    await expect(assert_real_path_inside(project, path.join(project, ".mdstore", "a.md"))).resolves.toBeUndefined();
  });

  it("refuses a folder that links outside the project", async (ctx) => {
    try {
      // "junction" works on Windows without admin rights; other platforms ignore the type.
      symlinkSync(outside, path.join(project, "linked"), "junction");
    } catch {
      ctx.skip();
    }
    await expect(assert_real_path_inside(project, path.join(project, "linked", "a.md"))).rejects.toThrow(
      UnsafePathError,
    );
  });
});
