import { existsSync, readdirSync } from "node:fs";
import path from "node:path";
import { is_installable, type Kind, type Tool } from "./kinds.js";

/**
 * Where a skill or an agent goes, by kind and tool. `<name>` is the listing's slug. Every target is a
 * file of its own that the CLI owns, so installing never touches the developer's own files and
 * updates only rewrite what the CLI wrote. Prompts have no target: they are copied or downloaded.
 * A tool missing from a kind has no known place for it yet; `--path` still works.
 */
export const install_targets: Record<"skill" | "agent", Partial<Record<Tool, string>>> = {
  // From the skills matrix in cli.md. `agents` is the shared `.agents/skills` folder that Codex and Zed
  // read natively. Aider has no skills folder.
  skill: {
    claude: ".claude/skills/<name>/SKILL.md",
    cursor: ".cursor/skills/<name>/SKILL.md",
    copilot: ".github/skills/<name>/SKILL.md",
    opencode: ".opencode/skills/<name>/SKILL.md",
    codex: ".agents/skills/<name>/SKILL.md",
    zed: ".agents/skills/<name>/SKILL.md",
    agents: ".agents/skills/<name>/SKILL.md",
  },
  // Subagents: only Claude Code's folder is known so far.
  agent: {
    claude: ".claude/agents/<name>.md",
  },
};

/** What `add` writes: the project-relative path of the listing's file, with `/` separators. */
export interface InstallPlan {
  file: string;
}

/** Thrown when a listing can't be installed for a tool; the message says what to do instead. */
export class NoTargetError extends Error {}

/** Why a prompt can't be installed, and what to do instead. */
export function prompt_not_installable(name: string): string {
  return `"${name}" is a prompt: copy or download it from its page on mdstore. The CLI installs skills and agents.`;
}

/** The kind's target for a tool. Throws NoTargetError for a prompt, or a tool with no known place. */
export function plan_install(kind: Kind, tool: Tool, name: string): InstallPlan {
  if (!is_installable(kind)) {
    throw new NoTargetError(prompt_not_installable(name));
  }
  const target = install_targets[kind][tool];
  if (!target) {
    throw new NoTargetError(
      `mdstore doesn't know where ${tool} keeps ${kind === "skill" ? "skills" : "agents"} yet. Pick another tool with --tool, or use --path <file> to choose the location.`,
    );
  }
  return { file: target.replace("<name>", name) };
}

/** A plan for a file the user chose with --path: written as-is. */
export function plan_custom_path(file: string): InstallPlan {
  return { file: file.split(path.sep).join("/") };
}

/** Signs of each tool in a project root, checked in this order. */
const tool_markers: { tool: Tool; matches: (entries: string[], root: string) => string | null }[] = [
  {
    tool: "claude",
    matches: (entries) => entries.find((entry) => entry === ".claude" || entry === "CLAUDE.md") ?? null,
  },
  {
    tool: "cursor",
    matches: (entries) => entries.find((entry) => entry === ".cursor" || entry === ".cursorrules") ?? null,
  },
  {
    tool: "copilot",
    matches: (_entries, root) =>
      existsSync(path.join(root, ".github", "copilot-instructions.md")) ? ".github/copilot-instructions.md" : null,
  },
  { tool: "opencode", matches: (entries) => entries.find((entry) => entry === ".opencode") ?? null },
  {
    tool: "aider",
    matches: (entries) => entries.find((entry) => entry === "CONVENTIONS.md" || entry.startsWith(".aider")) ?? null,
  },
  {
    tool: "agents",
    matches: (entries) => entries.find((entry) => entry === "AGENTS.md" || entry === ".agents") ?? null,
  },
];

/** The tool a project uses, from the files at its root, and the file that gave it away. Falls back to `agents`. */
export function detect_tool(root: string): { tool: Tool; marker: string | null } {
  const entries = readdirSync(root);
  for (const { tool, matches } of tool_markers) {
    const marker = matches(entries, root);
    if (marker) return { tool, marker };
  }
  return { tool: "agents", marker: null };
}
