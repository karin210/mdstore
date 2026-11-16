/**
 * How a listing is delivered. A `prompt` is copied or downloaded from the site and has no CLI install;
 * a `skill` and an `agent` (a subagent) are installed by `add` (see targets.ts). Same list as
 * prompt_kinds in the site's src/data/prompts.ts and the posted_prompts kind check (kinds.test.ts
 * fails when they drift apart).
 */
export const kinds = ["prompt", "skill", "agent"] as const;

export type Kind = (typeof kinds)[number];

export function is_kind(value: unknown): value is Kind {
  return typeof value === "string" && (kinds as readonly string[]).includes(value);
}

/** The kinds `add` can install. */
export type InstallableKind = Exclude<Kind, "prompt">;

export function is_installable(kind: Kind): kind is InstallableKind {
  return kind !== "prompt";
}

/** The AI tools `add` can install for. */
export const tools = ["claude", "cursor", "copilot", "opencode", "codex", "zed", "aider", "agents"] as const;

export type Tool = (typeof tools)[number];

export function is_tool(value: unknown): value is Tool {
  return typeof value === "string" && (tools as readonly string[]).includes(value);
}
