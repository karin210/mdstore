import { existsSync, readdirSync } from "node:fs";
import path from "node:path";
import type { PromptKind, Tool } from "./kinds.js";

/**
 * Where a prompt goes, by kind and tool. `<name>` is the prompt's slug.
 *
 * A `shared` target is one file the whole project and the user already own (CLAUDE.md, AGENTS.md…).
 * The CLI never writes a prompt into it: the prompt goes to its own file in `.mdstore/` and the
 * shared file gets one reference line (created if the file doesn't exist). So installing never
 * clobbers the user's text, several prompts can share one target, and updates only touch the
 * files the CLI owns.
 */
interface TargetSpec {
  path: string;
  shared: boolean;
}

export const install_targets: Record<PromptKind, Partial<Record<Tool, TargetSpec>>> = {
  instructions: {
    claude: { path: "CLAUDE.md", shared: true },
    cursor: { path: ".cursor/rules/<name>.mdc", shared: false },
    copilot: { path: ".github/copilot-instructions.md", shared: true },
    aider: { path: "CONVENTIONS.md", shared: true },
    agents: { path: "AGENTS.md", shared: true },
  },
  command: {
    claude: { path: ".claude/commands/<name>.md", shared: false },
    cursor: { path: ".cursor/commands/<name>.md", shared: false },
  },
  agent: {
    claude: { path: ".claude/agents/<name>.md", shared: false },
  },
};

/** Folder for prompts referenced from a shared target. */
export const mdstore_dir = ".mdstore";

/** What `add` writes: the prompt's file, and the reference line a shared target gets. */
export interface InstallPlan {
  /** Project-relative path of the prompt's own file, with `/` separators. */
  file: string;
  /** The shared file and the line that points it at `file`; null for a dedicated target. */
  reference: { file: string; line: string } | null;
}

/**
 * The line a shared file gets. Claude Code loads `@path` imports from CLAUDE.md; the other tools
 * have no import syntax, so their agent is told to read the file.
 */
export function reference_line(tool: Tool, file: string): string {
  return tool === "claude" ? `@${file}` : `- Follow the instructions in \`${file}\`.`;
}

/** The target for a kind and tool; kinds a tool has no place for fall back to its instructions target. */
export function get_target(kind: PromptKind, tool: Tool): TargetSpec {
  const target = install_targets[kind][tool] ?? install_targets.instructions[tool];
  if (!target) throw new Error(`No install target for ${tool}`);
  return target;
}

export function plan_install(kind: PromptKind, tool: Tool, name: string): InstallPlan {
  const target = get_target(kind, tool);
  if (!target.shared) return { file: target.path.replace("<name>", name), reference: null };

  const file = `${mdstore_dir}/${name}.md`;
  return { file, reference: { file: target.path, line: reference_line(tool, file) } };
}

/** A plan for a file the user chose with --path: written as-is, no reference line. */
export function plan_custom_path(file: string): InstallPlan {
  return { file: file.split(path.sep).join("/"), reference: null };
}

/** Cursor reads `.mdc` rules only with frontmatter; the other targets get the file unchanged. */
export function render_for_target(
  file: string,
  content: string,
  prompt: { kind: PromptKind; tagline: string },
): string {
  if (!file.endsWith(".mdc")) return content;
  // JSON strings are valid YAML double-quoted scalars, so any tagline is safe here.
  const always_apply = prompt.kind === "instructions";
  return `---\ndescription: ${JSON.stringify(prompt.tagline)}\nalwaysApply: ${always_apply}\n---\n\n${content}`;
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
  {
    tool: "aider",
    matches: (entries) => entries.find((entry) => entry === "CONVENTIONS.md" || entry.startsWith(".aider")) ?? null,
  },
  { tool: "agents", matches: (entries) => entries.find((entry) => entry === "AGENTS.md") ?? null },
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
