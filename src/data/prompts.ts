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
  /** Short, catchy one-liner shown as the h2 under the title on the listing page. */
  tagline: string;
  summary: string;
  /** The file's key rules, one short sentence each, listed on the listing page. */
  highlights: string[];
  /** Kinds of projects the file is written for, as short tags ("Meant for" on the listing page). */
  meantFor: string[];
  /** Suggested steps from getting the file to using it. Text in `backticks` renders as inline code. */
  usageSteps: string[];
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
    tagline: "Give your agent the habits of a careful senior web developer, from the first commit.",
    summary:
      "Starting instructions for any website or web app: semantic HTML, WCAG 2.1 AA, design tokens, fluid CSS, SOLID structure, forms, loading states and secure server defaults.",
    highlights: [
      "Semantic HTML and WCAG 2.1 AA accessibility on every component",
      "Colours, font sizes and spacing as :root tokens with fluid clamp() scaling",
      "Two modal types, dismissible or not, with shared global styling",
      "Forms with inline, as-you-type guidance and password rules that accept browser-suggested passwords",
      "Skeletons, empty and error states for every async operation",
      "Server-side validation, authorization and correct HTTP status codes, with no leaked internals",
      "Branded 404, safe redirects and unique page titles",
    ],
    meantFor: ["Websites and web apps", "Any framework or stack", "New projects", "Existing codebases"],
    usageSteps: [
      "Download `global.md`. It's free.",
      "Save it in your project's root, then add the line `@global.md` to your `CLAUDE.md` so Claude Code loads it in every session. With no `CLAUDE.md` yet, rename the file to `CLAUDE.md` instead.",
      "Work as usual. The agent applies the conventions to every file it creates or changes, and follows your codebase where it already does things differently.",
      "Add a framework-specific file, such as `nextjs-structure.md`, on top of it for project structure.",
    ],
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
    tagline: "Stop asking where the file goes. Your agent already knows.",
    summary:
      "Where every file goes in a Next.js App Router project: src/ layout, routes-only app/, component folders, server-only code, public/ assets, aliases, titles and route protection.",
    highlights: [
      "A complete src/ tree showing where every kind of file belongs",
      "app/ holds routes only, with the home page in a (homepage) route group",
      "Component folders per route, per feature and global/, with no loose files",
      "Server-only code in src/server/, guarded with server-only imports",
      "Static files in public/; paid or private files served through an access-checked route",
      "@/* imports with no barrel files, and one title template for every page",
      "proxy.ts for redirects, with real permission checks in every handler",
    ],
    meantFor: ["Next.js App Router", "TypeScript projects", "New projects", "Existing codebases"],
    usageSteps: [
      "Buy and download `nextjs-structure.md`.",
      "Save it in your project's root, then add the line `@nextjs-structure.md` to your `CLAUDE.md` so Claude Code loads it in every session.",
      "On a new project, ask the agent to scaffold it following the file. On an existing one, it keeps your current structure where it differs and tells you about the difference.",
      "Let the agent keep the structure section of your `CLAUDE.md` current as it adds routes and folders.",
    ],
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
