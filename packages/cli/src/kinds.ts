/**
 * What a prompt file is; it decides where `add` installs it (see targets.ts). Same list as
 * prompt_kinds in the site's src/data/prompts.ts and the posted_prompts kind check (kinds.test.ts
 * fails when they drift apart).
 */
export const prompt_kinds = ["instructions", "command", "agent"] as const;

export type PromptKind = (typeof prompt_kinds)[number];

export function is_prompt_kind(value: unknown): value is PromptKind {
  return typeof value === "string" && (prompt_kinds as readonly string[]).includes(value);
}

/** The AI tools `add` can install for. */
export const tools = ["claude", "cursor", "copilot", "aider", "agents"] as const;

export type Tool = (typeof tools)[number];

export function is_tool(value: unknown): value is Tool {
  return typeof value === "string" && (tools as readonly string[]).includes(value);
}
