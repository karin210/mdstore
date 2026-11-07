export const promptCategories = ["Conventions", "Agents", "Frontend", "Testing", "Refactoring", "DevOps"] as const;

export type PromptCategory = (typeof promptCategories)[number];

/** A screenshot of what the prompt produced, served from public/ (e.g. "/examples/global/form.webp"). */
export interface OutputExample {
  src: string;
  /** Describes what the screenshot shows, for screen readers. */
  alt: string;
  caption: string;
}

export interface PromptListing {
  slug: string;
  fileName: string;
  title: string;
  summary: string;
  category: PromptCategory;
  author: string;
  priceUsd: number;
  lineCount: number;
  worksWith: string[];
  /** First lines of the file, shown in the free preview. */
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

/** URL of a listing's detail page (src/app/prompts/[slug]). */
export function promptHref(prompt: PromptListing): string {
  return `/prompts/${prompt.slug}`;
}

/** Download URL of a free listing's full .md file (served by src/app/prompts/[slug]/download). */
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
    title: "Web project conventions",
    summary:
      "Starting instructions for any website or web app: semantic HTML, WCAG 2.1 AA, design tokens, fluid CSS, SOLID structure, forms, loading states and secure server defaults.",
    category: "Conventions",
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
    title: "Next.js project structure",
    summary:
      "Where every file goes in a Next.js App Router project: src/ layout, routes-only app/, component folders, server-only code, public/ assets, aliases, titles and route protection.",
    category: "Conventions",
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
