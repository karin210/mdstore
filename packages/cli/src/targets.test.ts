import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { detect_tool, NoTargetError, plan_custom_path, plan_install } from "./targets.js";

describe("plan_install", () => {
  // The skills matrix in cli.md.
  it.each([
    ["claude", ".claude/skills/review/SKILL.md"],
    ["cursor", ".cursor/skills/review/SKILL.md"],
    ["copilot", ".github/skills/review/SKILL.md"],
    ["opencode", ".opencode/skills/review/SKILL.md"],
    ["codex", ".agents/skills/review/SKILL.md"],
    ["zed", ".agents/skills/review/SKILL.md"],
    ["agents", ".agents/skills/review/SKILL.md"],
  ] as const)("installs a skill for %s at %s", (tool, file) => {
    expect(plan_install("skill", tool, "review")).toEqual({ file });
  });

  it("installs an agent for claude at its own file", () => {
    expect(plan_install("agent", "claude", "review")).toEqual({ file: ".claude/agents/review.md" });
  });

  it("has no install for a prompt: it is copied or downloaded", () => {
    expect(() => plan_install("prompt", "claude", "global")).toThrow(NoTargetError);
    expect(() => plan_install("prompt", "claude", "global")).toThrow(/copy or download/);
  });

  it("says where to look when a tool has no known folder for a skill", () => {
    expect(() => plan_install("skill", "aider", "review")).toThrow(/--path/);
  });

  it.each(["cursor", "copilot", "opencode", "codex", "zed", "aider", "agents"] as const)(
    "says where to look when %s has no known folder for an agent",
    (tool) => {
      expect(() => plan_install("agent", tool, "review")).toThrow(NoTargetError);
      expect(() => plan_install("agent", tool, "review")).toThrow(/--path/);
    },
  );
});

describe("plan_custom_path", () => {
  it("writes exactly where asked", () => {
    expect(plan_custom_path("docs/rules.md")).toEqual({ file: "docs/rules.md" });
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
    [".opencode", "opencode"],
    [".agents", "agents"],
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
