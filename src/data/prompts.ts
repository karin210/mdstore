import type { Messages } from "@/i18n/messages";

/** Stable category ids; their labels live in the catalogue under `prompts.categories.<id>`. */
export const promptCategories = ["conventions", "agents", "frontend", "testing", "refactoring", "devops"] as const;

export type PromptCategory = (typeof promptCategories)[number];

/**
 * A listing's slug doubles as its catalogue key: its title, tagline, summary, highlights, "meant for"
 * tags and usage steps live under `prompts.listings.<slug>` in src/i18n/locales/{en,es}/prompts.json.
 */
export type PromptSlug = keyof Messages["prompts"]["listings"];

/** A screenshot of what the prompt produced, served from public/ (e.g. "/examples/global/form.webp"). */
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
  author: string;
  priceUsd: number;
  lineCount: number;
  worksWith: string[];
  /** First lines of the file, shown in the free preview. The files are written in English. */
  excerpt: string;
  /** Screenshots of the prompt's output; the detail page shows placeholders until there are some. */
  outputExamples: OutputExample[];
}

export function isFree(prompt: PromptListing): boolean {
  return prompt.priceUsd === 0;
}

export function findPromptBySlug(slug: string): PromptListing | undefined {
  return featuredPrompts.find((prompt) => prompt.slug === slug);
}

/** Path of a listing's detail page (src/app/[locale]/prompts/[slug]); locale-aware links prefix it. */
export function promptHref(prompt: PromptListing): string {
  return `/prompts/${prompt.slug}`;
}

/** Path of a free listing's full .md file (served by src/app/[locale]/prompts/[slug]/download). */
export function downloadHref(prompt: PromptListing): string {
  return `/prompts/${prompt.slug}/download`;
}

/**
 * Catalogue shown on the landing page until listings come from the API.
 * The full files live in `content/prompts/`; keep `excerpt` and `lineCount` in sync with them.
 */
export const featuredPrompts: PromptListing[] = [
  {
    slug: "global",
    fileName: "global.md",
    category: "conventions",
    author: "@mdstore",
    priceUsd: 0,
    lineCount: 201,
    worksWith: ["Claude Code"],
    excerpt: `# Web project conventions

Baseline conventions for any website or web app, whatever the framework. Apply them to every file you create or change.

- **The codebase wins.** If the project already follows a different convention, keep it, don't mix the two, and mention the difference.
- **Readability wins.** If a rule here makes the code more complex than the problem needs, choose the simplest readable solution.
- **Write in the project's language.** UI copy, error messages and route names use the site's language.

## 1. Principles

- **Simplest readable implementation first.** Only trade readability for performance when the difference is significant and measurable.`,
    outputExamples: [],
  },
  {
    slug: "nextjs-structure",
    fileName: "nextjs-structure.md",
    category: "conventions",
    author: "@mdstore",
    priceUsd: 5,
    lineCount: 135,
    worksWith: ["Claude Code"],
    excerpt: `# Next.js project structure

Where every file goes in a Next.js App Router project (TypeScript). Follow it when you scaffold the project, add a feature, or decide where a new file belongs.

- **The codebase wins.** If the project already has an established structure, follow it, don't mix the two, and mention the difference.
- **Create folders when they are needed.** Don't scaffold empty folders "for later".
- **Check the installed version.** Next.js changes conventions between major versions. Read the docs that ship in \`node_modules/next/dist/docs/\` before relying on an API you remember, and heed deprecation notices.`,
    outputExamples: [],
  },
];
