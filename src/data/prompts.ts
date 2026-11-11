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
export const featuredPrompts: PromptListing[] = [
  {
    slug: "global",
    fileName: "global.md",
    category: "conventions",
    author: "@mdstore",
    priceUsd: 0,
    lineCount: 280,
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
  {
    slug: "dev-tools-advisor",
    fileName: "dev-tools-advisor.md",
    category: "agents",
    author: "@mdstore",
    priceUsd: 0,
    lineCount: 68,
    worksWith: ["Claude Code"],
    excerpt: `# Dev tools and stack advisor

Recommends the tools and stack that fit the project and the developer's setup: linter, formatter, test runner, package manager, framework or library. Follow it when a project starts, when the user asks which tool to use or asks you to run this advisor, or when the current tooling keeps causing friction. It works with any AI agent, editor, operating system and language: detect the setup, never assume it.

- **The user's choice wins.** When the user has already chosen a tool, or names the one they want, use it and set it up well instead of arguing for another. If it has a serious problem (abandoned, incompatible with their versions, insecure), say so once, then follow their decision. Decisions recorded in the project's instruction files count as the user's choice.
- **Recommend, don't install.** Return a recommendation; install only after the user approves it.
- **The codebase wins.** In a project in progress, a working setup stays unless the gain is clear.
- **Research, don't remember.** Tools change fast: check their current docs before recommending them.`,
    outputExamples: [],
  },
  {
    slug: "commit-attribution",
    fileName: "commit-attribution.md",
    category: "conventions",
    author: "@mdstore",
    priceUsd: 0,
    lineCount: 81,
    worksWith: ["Claude Code"],
    excerpt: `# Commit messages without AI attribution

Keeps commit messages, pull request texts and release notes free of credits to an AI assistant, so the history only describes the change. Follow it whenever you create, amend or squash a commit, write a pull request title or description, or find that a tool, template or hook has added a line of its own to a message.

- **The project's policy wins.** If the project or the user asks for AI assistance to be disclosed, follow that policy instead and say so. Without such a policy, this file applies.
- **The message describes the change, nothing else.** What changed and why, written for the next developer who reads the history.
- **Strip, don't argue.** When an attribution line appears, remove it silently and carry on. Don't add a note about it.`,
    outputExamples: [],
  },
  {
    slug: "authentication-forms",
    fileName: "authentication-forms.md",
    category: "frontend",
    author: "@mdstore",
    priceUsd: 0,
    lineCount: 83,
    worksWith: ["Claude Code"],
    excerpt: `# Authentication forms

How to build sign-in, sign-up and password forms that are easy to get right: one page with tabs, validation as the user types, guidance under each field, and password rules that accept whatever the browser suggests. Follow it whenever you create or change a sign-in, sign-up, password reset or similar account form.

- **The codebase wins.** If the project already has form components or a validation module, extend them, don't mix two approaches, and mention the difference.
- **Write in the project's language.** Labels, guidance and error messages use the site's language. The strings below are examples.
- **The server decides.** Everything the form checks is checked again on the server with the same rules; client validation is only guidance.`,
    outputExamples: [],
  },
  {
    slug: "modals",
    fileName: "modals.md",
    category: "frontend",
    author: "@mdstore",
    priceUsd: 0,
    lineCount: 54,
    worksWith: ["Claude Code"],
    excerpt: `# Modals

How to build modal dialogs: which kind to use, how each one closes, and how to style them so every modal in the project looks and behaves the same. Follow it whenever you create or change a modal, a dialog, a confirmation or an overlay panel.

- **The codebase wins.** If the project already has a modal component or a dialog convention, extend it, don't mix two, and mention the difference.
- **Reuse, don't redefine.** Modal typography, inputs, close button and action row live in one shared place (the global stylesheet or one modal component), never per modal.
- **Readability first.** A modal usually carries important information, so its text stays plain and easy to read.`,
    outputExamples: [],
  },
  {
    slug: "loading-states",
    fileName: "loading-states.md",
    category: "frontend",
    author: "@mdstore",
    priceUsd: 0,
    lineCount: 59,
    worksWith: ["Claude Code"],
    excerpt: `# Loading states

What the interface shows while something asynchronous happens, and when it fails or comes back empty. Follow it for every data fetch, form submission, mutation, upload, authentication call, route transition that waits on data and lazy-loaded piece of content.

- **The codebase wins.** If the project already has a spinner, skeleton or status component, reuse it and mention any gap.
- **Never leave the user staring at a frozen or blank screen.** Every async operation has a visible state.
- **Every async view handles four outcomes:** loading, success, empty and error.`,
    outputExamples: [],
  },
  {
    slug: "error-handling-and-http-status",
    fileName: "error-handling-and-http-status.md",
    category: "conventions",
    author: "@mdstore",
    priceUsd: 0,
    lineCount: 80,
    worksWith: ["Claude Code"],
    excerpt: `# Error handling and HTTP status codes

How a server answers when something goes wrong, and how a client reads the answer: safe messages, the right status code, no leaked internals. Follow it whenever you write or change an API route, a form action, a server function or the client code that calls them.

- **The codebase wins.** If the project already has an error handler or a response shape, extend it, don't mix two, and mention the difference.
- **The status code is the signal; the body only adds detail.** Never respond \`200 OK\` with a failure inside the body (\`{ "success": false }\`).
- **One central place.** Errors are translated by a central handler or helper, so no route can forget to.`,
    outputExamples: [],
  },
  {
    slug: "ai-discoverability-geo",
    fileName: "ai-discoverability-geo.md",
    category: "conventions",
    author: "@mdstore",
    priceUsd: 0,
    lineCount: 90,
    worksWith: ["Claude Code"],
    excerpt: `# AI discoverability

How to make a public website easy for AI assistants to find, read and quote. Follow it when you build or change a public site: its rendering, \`llms.txt\`, \`robots.txt\`, sitemap, structured data and the way its pages are written.

- **The codebase wins.** If the site already generates a sitemap or \`robots.txt\`, extend that, don't add a second one, and mention the difference.
- **Build for three things only:** being in the models' training data, being found by their live search, and being easy to read and quote. Skip speculative formats.
- **Generate, don't hand-write.** Files that list the site's pages come from the same data that renders the pages, so they never go stale.`,
    outputExamples: [],
  },
];
