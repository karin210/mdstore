import { type TestedModel } from "@/data/aiModels";
import type { Messages } from "@/i18n/messages";

/** Stable category ids; their labels live in the catalogue under `prompts.categories.<id>`. */
export const promptCategories = ["conventions", "agents", "frontend", "testing", "refactoring", "devops"] as const;

export type PromptCategory = (typeof promptCategories)[number];

/**
 * What a listing is, which decides how a developer gets it: a `prompt` is copied or downloaded and used in a
 * session; a `skill` is installed in the agent's skills folder; an `agent` is a subagent, installed in its
 * agents folder. The mdstore CLI installs skills and agents (packages/cli/src/targets.ts), not prompts. The
 * posted_prompts and prompt_revisions kind checks and the CLI keep the same list.
 */
export const prompt_kinds = ["prompt", "skill", "agent"] as const;

export type PromptKind = (typeof prompt_kinds)[number];

/**
 * A listing's slug doubles as its catalogue key: its title, tagline, summary, highlights, "meant for"
 * tags and usage steps live under `prompts.listings.<slug>` in src/i18n/locales/{en,es}/prompts.json.
 */
export type PromptSlug = keyof Messages["prompts"]["listings"];

/**
 * A screenshot of what the prompt produced: a file under public/ (e.g. "/examples/global/form.webp") or, for
 * posts, a public Storage URL (see src/lib/outputExamples.ts). The caption is empty when the author wrote none.
 */
export interface OutputExample {
  src: string;
  /** Describes what the screenshot shows, for screen readers. */
  alt: string;
  caption: string;
}

/** The locale-independent part of a listing; its copy comes from the message catalogue. */
export interface PromptListing {
  slug: PromptSlug;
  fileName: string;
  category: PromptCategory;
  /** How a developer gets the file; see prompt_kinds. */
  kind: PromptKind;
  /**
   * Starts at 1. Bump it by hand, by one, in the same commit that changes the file in content/prompts/:
   * the CLI compares it with its lockfile to find updates, so an unbumped change never reaches users.
   */
  version: number;
  author: string;
  priceUsd: number;
  lineCount: number;
  /** About how many tokens the file takes in a model's context window; see estimate_context_tokens. */
  context_tokens: number;
  worksWith: string[];
  /** The specific models (by family) the prompt was tested against, with the recommended ones flagged. */
  tested_models: TestedModel[];
  /** First lines of the file, shown in the free preview. The files are written in English. */
  excerpt: string;
  /** Screenshots of the prompt's output; the detail page shows placeholders until there are some. */
  outputExamples: OutputExample[];
}

export function isFree(prompt: Pick<PromptListing, "priceUsd">): boolean {
  return prompt.priceUsd === 0;
}

export function findPromptBySlug(slug: string): PromptListing | undefined {
  return featuredPrompts.find((prompt) => prompt.slug === slug);
}

/** Path of a listing's detail page (src/app/[locale]/prompts/[slug]); locale-aware links prefix it. */
export function promptHref(prompt: { slug: string }): string {
  return `/prompts/${prompt.slug}`;
}

/** Path of a free listing's full .md file (served by src/app/[locale]/prompts/[slug]/download). */
export function downloadHref(prompt: { slug: string }): string {
  return `/prompts/${prompt.slug}/download`;
}

/**
 * Catalogue shown on the landing page until listings come from the API.
 * The full files live in `content/prompts/`; keep `excerpt` and `lineCount` in sync with them.
 */
export const featuredPrompts: PromptListing[] = [];
