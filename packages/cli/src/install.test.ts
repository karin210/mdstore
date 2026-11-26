import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { sha256_hex, IntegrityError } from "./hash.js";
import { install_prompt, InstallCancelledError, type InstallInput } from "./install.js";
import { plan_custom_path, plan_install } from "./targets.js";
import type { PromptDetails } from "./validation.js";

const content = "# Global\n\nRules.\n";

const details: PromptDetails = {
  slug: "global",
  title: "Global",
  tagline: "Rules",
  category: "code-conventions",
  kind: "skill",
  version: 1,
  priceUsd: 0,
  fileName: "global.md",
  author: "@mdstore",
  sha256: sha256_hex(content),
  worksWith: [],
  lineCount: 3,
  context_tokens: 50,
};

let root: string;
const read = (file: string) => readFileSync(path.join(root, file), "utf8");
const never_ask = () => Promise.reject(new Error("should not ask"));

function input(overrides: Partial<InstallInput> = {}): InstallInput {
  return {
    root,
    details,
    content,
    tool: "claude",
    plan: plan_install("skill", "claude", "global"),
    assume_yes: false,
    ask: never_ask,
    ...overrides,
  };
}

beforeEach(() => {
  root = mkdtempSync(path.join(tmpdir(), "mdstore-install-"));
});
afterEach(() => rmSync(root, { recursive: true, force: true }));

describe("install_prompt", () => {
  it("writes the skill's own file, byte for byte, and describes it for the lockfile", async () => {
    const result = await install_prompt(input());

    expect(read(".claude/skills/global/SKILL.md")).toBe(content);
    expect(result.wrote_file).toBe(true);
    expect(result.entry).toEqual({
      version: 1,
      sha256: sha256_hex(content),
      path: ".claude/skills/global/SKILL.md",
      kind: "skill",
      tool: "claude",
    });
  });

  it("does not write again when the file on disk is already identical", async () => {
    await install_prompt(input());
    expect(await install_prompt(input())).toMatchObject({ wrote_file: false });
  });
});

describe("install_prompt over an existing file", () => {
  const plan = plan_install("agent", "claude", "global");

  it("refuses to overwrite a different file without a terminal or --yes", async () => {
    await install_prompt(input());
    const file = ".claude/skills/global/SKILL.md";
    writeFileSync(path.join(root, file), "my edits");

    await expect(install_prompt(input({ ask: async () => "not_interactive" }))).rejects.toThrow(/--yes/);
    expect(read(file)).toBe("my edits");
  });

  it("keeps the file when the user answers no, and overwrites on yes", async () => {
    await install_prompt(input({ plan, details: { ...details, kind: "agent" } }));
    writeFileSync(path.join(root, plan.file), "mine");

    await expect(install_prompt(input({ plan, ask: async () => "no" }))).rejects.toThrow(InstallCancelledError);
    expect(read(plan.file)).toBe("mine");

    await install_prompt(input({ plan, ask: async () => "yes" }));
    expect(read(plan.file)).toBe(content);
  });

  it("replaces its own unedited copy from an earlier install without asking", async () => {
    const first = await install_prompt(input({ plan }));
    const next = "# Global v2\n";
    const result = await install_prompt(
      input({
        plan,
        content: next,
        details: { ...details, version: 2, sha256: sha256_hex(next) },
        previous: first.entry,
      }),
    );
    expect(read(plan.file)).toBe(next);
    expect(result.entry.version).toBe(2);
  });
});

describe("install_prompt safety", () => {
  it("writes nothing when the download doesn't match its sha256", async () => {
    await expect(install_prompt(input({ content: "tampered" }))).rejects.toThrow(IntegrityError);
    expect(existsSync(path.join(root, ".claude"))).toBe(false);
  });

  it("refuses a --path outside the project", async () => {
    await expect(install_prompt(input({ plan: plan_custom_path("../escape.md") }))).rejects.toThrow(/outside/);
  });

  it("refuses a paid prompt", async () => {
    await expect(install_prompt(input({ details: { ...details, priceUsd: 5, sha256: null } }))).rejects.toThrow(
      InstallCancelledError,
    );
  });
});
