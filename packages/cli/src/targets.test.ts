import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { prompt_kinds, tools } from "./kinds.js";
import { detect_tool, plan_custom_path, plan_install, reference_line, render_for_target } from "./targets.js";

describe("plan_install", () => {
  it.each([
    ["claude", ".mdstore/global.md", "CLAUDE.md", "@.mdstore/global.md"],
    ["agents", ".mdstore/global.md", "AGENTS.md", "- Follow the instructions in `.mdstore/global.md`."],
    [
      "copilot",
      ".mdstore/global.md",
      ".github/copilot-instructions.md",
      "- Follow the instructions in `.mdstore/global.md`.",
    ],
    ["aider", ".mdstore/global.md", "CONVENTIONS.md", "- Follow the instructions in `.mdstore/global.md`."],
  ] as const)("keeps shared %s instructions in .mdstore/ and references them", (tool, file, shared, line) => {
    expect(plan_install("instructions", tool, "global")).toEqual({ file, reference: { file: shared, line } });
  });

  it("gives Cursor rules their own .mdc file", () => {
    expect(plan_install("instructions", "cursor", "global")).toEqual({
      file: ".cursor/rules/global.mdc",
      reference: null,
    });
  });

  it.each([
    ["command", "claude", ".claude/commands/review.md"],
    ["command", "cursor", ".cursor/commands/review.md"],
    ["agent", "claude", ".claude/agents/review.md"],
  ] as const)("installs a %s for %s at its own file", (kind, tool, file) => {
    expect(plan_install(kind, tool, "review")).toEqual({ file, reference: null });
  });

  it("falls back to the instructions target when a tool has no place for the kind", () => {
    expect(plan_install("agent", "cursor", "advisor")).toEqual(plan_install("instructions", "cursor", "advisor"));
    expect(plan_install("agent", "agents", "advisor")).toEqual(plan_install("instructions", "agents", "advisor"));
    expect(plan_install("command", "copilot", "x")).toEqual(plan_install("instructions", "copilot", "x"));
  });

  it("has a target for every kind and tool", () => {
    for (const kind of prompt_kinds) {
      for (const tool of tools) expect(() => plan_install(kind, tool, "x")).not.toThrow();
    }
  });
});

describe("reference_line", () => {
  it("uses Claude Code's import syntax only for claude", () => {
    expect(reference_line("claude", ".mdstore/a.md")).toBe("@.mdstore/a.md");
    expect(reference_line("agents", ".mdstore/a.md")).toContain("`.mdstore/a.md`");
  });
});

describe("plan_custom_path", () => {
  it("writes exactly where asked, without a reference", () => {
    expect(plan_custom_path("docs/rules.md")).toEqual({ file: "docs/rules.md", reference: null });
  });
});

describe("render_for_target", () => {
  const prompt = { kind: "instructions" as const, tagline: 'Rules with "quotes"' };

  it("leaves Markdown targets byte for byte", () => {
    expect(render_for_target("CLAUDE.md", "# Hi\n", prompt)).toBe("# Hi\n");
  });

  it("adds Cursor frontmatter with a safely quoted description", () => {
    expect(render_for_target(".cursor/rules/a.mdc", "# Hi\n", prompt)).toBe(
      '---\ndescription: "Rules with \\"quotes\\""\nalwaysApply: true\n---\n\n# Hi\n',
    );
    expect(render_for_target(".cursor/rules/a.mdc", "x", { ...prompt, kind: "agent" })).toContain("alwaysApply: false");
  });
});

describe("detect_tool", () => {
  let root: string;
  beforeEach(() => {
    root = mkdtempSync(path.join(tmpdir(), "mdstore-detect-"));
  });
  afterEach(() => rmSync(root, { recursive: true, force: true }));

  it("falls back to agents in an empty project", () => {
    expect(detect_tool(root)).toEqual({ tool: "agents", marker: null });
  });

  it.each([
    [".claude", "claude"],
    ["CLAUDE.md", "claude"],
    [".cursor", "cursor"],
    ["CONVENTIONS.md", "aider"],
    [".aider.conf.yml", "aider"],
    ["AGENTS.md", "agents"],
  ] as const)("detects %s as %s", (marker, tool) => {
    writeFileSync(path.join(root, marker), "");
    expect(detect_tool(root)).toEqual({ tool, marker });
  });

  it("detects Copilot from .github/copilot-instructions.md", () => {
    mkdirSync(path.join(root, ".github"));
    writeFileSync(path.join(root, ".github", "copilot-instructions.md"), "");
    expect(detect_tool(root).tool).toBe("copilot");
  });

  it("prefers claude over agents when both are present", () => {
    writeFileSync(path.join(root, "AGENTS.md"), "");
    writeFileSync(path.join(root, "CLAUDE.md"), "");
    expect(detect_tool(root).tool).toBe("claude");
  });
});
