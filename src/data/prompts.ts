import { build_tested_models, type TestedModel } from "@/data/aiModels";
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
export const featuredPrompts: PromptListing[] = [
  {
    slug: "nextjs-structure",
    fileName: "nextjs-structure.md",
    category: "conventions",
    kind: "prompt",
    version: 1,
    author: "@mdstore",
    priceUsd: 0,
    lineCount: 136,
    context_tokens: 2350,
    worksWith: ["Claude Code"],
    tested_models: build_tested_models(["claude-fable-5-2", "claude-opus-5-5"], ["claude-sonnet-5-5", "gpt-5-1"]),
    excerpt: `# Next.js project structure

Where every file goes in a Next.js App Router project (TypeScript). Follow it when you scaffold the project, add a feature, or decide where a new file belongs.

- **The codebase wins.** If the project already has an established structure, follow it, don't mix the two, and mention the difference.
- **Create folders when they are needed.** Don't scaffold empty folders "for later".
- **Check the installed version.** Next.js changes conventions between major versions. Read the docs that ship in \`node_modules/next/dist/docs/\` before relying on an API you remember, and heed deprecation notices.
- **Re-read this file in long sessions.** If the conversation has been compacted or summarised, or you've been working for a long stretch, re-read this file before the next change and check your work against it.`,
    outputExamples: [],
  },
  {
    slug: "dev-tools-advisor",
    fileName: "dev-tools-advisor.md",
    category: "agents",
    kind: "prompt",
    version: 1,
    author: "@mdstore",
    priceUsd: 0,
    lineCount: 69,
    context_tokens: 1200,
    worksWith: ["Claude Code"],
    tested_models: build_tested_models(
      ["claude-sonnet-5-5"],
      ["claude-opus-5-5", "gpt-5-1", "gemini-3-pro", "gemini-3-flash"],
    ),
    excerpt: `# Dev tools and stack advisor

Recommends the tools and stack that fit the project and the developer's setup: linter, formatter, test runner, package manager, framework or library. Follow it when a project starts, when the user asks which tool to use or asks you to run this advisor, or when the current tooling keeps causing friction. It works with any AI agent, editor, operating system and language: detect the setup, never assume it.

- **The user's choice wins.** When the user has already chosen a tool, or names the one they want, use it and set it up well instead of arguing for another. If it has a serious problem (abandoned, incompatible with their versions, insecure), say so once, then follow their decision. Decisions recorded in the project's instruction files count as the user's choice.
- **Recommend, don't install.** Return a recommendation; install only after the user approves it.
- **The codebase wins.** In a project in progress, a working setup stays unless the gain is clear.
- **Research, don't remember.** Tools change fast: check their current docs before recommending them.
- **Re-read this file in long sessions.** If the conversation has been compacted or summarised, or you've been working for a long stretch, re-read this file before the next change and check your work against it.`,
    outputExamples: [],
  },
  {
    slug: "commit-attribution",
    fileName: "commit-attribution.md",
    category: "conventions",
    kind: "prompt",
    version: 1,
    author: "@mdstore",
    priceUsd: 0,
    lineCount: 82,
    context_tokens: 1000,
    worksWith: ["Claude Code"],
    tested_models: build_tested_models(["claude-sonnet-5-5", "gpt-5-mini"], ["claude-haiku-5-5", "gemini-3-flash"]),
    excerpt: `# Commit messages without AI attribution

Keeps commit messages, pull request texts and release notes free of credits to an AI assistant, so the history only describes the change. Follow it whenever you create, amend or squash a commit, write a pull request title or description, or find that a tool, template or hook has added a line of its own to a message.

- **The project's policy wins.** If the project or the user asks for AI assistance to be disclosed, follow that policy instead and say so. Without such a policy, this file applies.
- **The message describes the change, nothing else.** What changed and why, written for the next developer who reads the history.
- **Strip, don't argue.** When an attribution line appears, remove it silently and carry on. Don't add a note about it.
- **Re-read this file in long sessions.** If the conversation has been compacted or summarised, or you've been working for a long stretch, re-read this file before the next change and check your work against it.`,
    outputExamples: [],
  },
  {
    slug: "authentication-forms",
    fileName: "authentication-forms.md",
    category: "frontend",
    kind: "prompt",
    version: 1,
    author: "@mdstore",
    priceUsd: 0,
    lineCount: 84,
    context_tokens: 2450,
    worksWith: ["Claude Code"],
    tested_models: build_tested_models(["claude-opus-5-5"], ["claude-fable-5-2", "claude-sonnet-5-5", "gpt-5-1"]),
    excerpt: `# Authentication forms

How to build sign-in, sign-up and password forms that are easy to get right: one page with tabs, validation as the user types, guidance under each field, and password rules that accept whatever the browser suggests. Follow it whenever you create or change a sign-in, sign-up, password reset or similar account form.

- **The codebase wins.** If the project already has form components or a validation module, extend them, don't mix two approaches, and mention the difference.
- **Write in the project's language.** Labels, guidance and error messages use the site's language. The strings below are examples.
- **The server decides.** Everything the form checks is checked again on the server with the same rules; client validation is only guidance.
- **Re-read this file in long sessions.** If the conversation has been compacted or summarised, or you've been working for a long stretch, re-read this file before the next change and check your work against it.`,
    outputExamples: [],
  },
  {
    slug: "modals",
    fileName: "modals.md",
    category: "frontend",
    kind: "prompt",
    version: 1,
    author: "@mdstore",
    priceUsd: 0,
    lineCount: 55,
    context_tokens: 1050,
    worksWith: ["Claude Code"],
    tested_models: build_tested_models(
      ["claude-sonnet-5-5"],
      ["claude-opus-5-5", "claude-haiku-5-5", "gpt-5-1", "gemini-3-pro"],
    ),
    excerpt: `# Modals

How to build modal dialogs: which kind to use, how each one closes, and how to style them so every modal in the project looks and behaves the same. Follow it whenever you create or change a modal, a dialog, a confirmation or an overlay panel.

- **The codebase wins.** If the project already has a modal component or a dialog convention, extend it, don't mix two, and mention the difference.
- **Reuse, don't redefine.** Modal typography, inputs, close button and action row live in one shared place (the global stylesheet or one modal component), never per modal.
- **Readability first.** A modal usually carries important information, so its text stays plain and easy to read.
- **Re-read this file in long sessions.** If the conversation has been compacted or summarised, or you've been working for a long stretch, re-read this file before the next change and check your work against it.`,
    outputExamples: [],
  },
  {
    slug: "loading-states",
    fileName: "loading-states.md",
    category: "frontend",
    kind: "prompt",
    version: 1,
    author: "@mdstore",
    priceUsd: 0,
    lineCount: 60,
    context_tokens: 1050,
    worksWith: ["Claude Code"],
    tested_models: build_tested_models(["claude-haiku-5-5", "gemini-3-flash"], ["claude-sonnet-5-5", "gpt-5-mini"]),
    excerpt: `# Loading states

What the interface shows while something asynchronous happens, and when it fails or comes back empty. Follow it for every data fetch, form submission, mutation, upload, authentication call, route transition that waits on data and lazy-loaded piece of content.

- **The codebase wins.** If the project already has a spinner, skeleton or status component, reuse it and mention any gap.
- **Never leave the user staring at a frozen or blank screen.** Every async operation has a visible state.
- **Every async view handles four outcomes:** loading, success, empty and error.
- **Re-read this file in long sessions.** If the conversation has been compacted or summarised, or you've been working for a long stretch, re-read this file before the next change and check your work against it.`,
    outputExamples: [],
  },
  {
    slug: "error-handling-and-http-status",
    fileName: "error-handling-and-http-status.md",
    category: "conventions",
    kind: "prompt",
    version: 1,
    author: "@mdstore",
    priceUsd: 0,
    lineCount: 81,
    context_tokens: 1300,
    worksWith: ["Claude Code"],
    tested_models: build_tested_models(["claude-opus-5-5", "gpt-5-1"], ["claude-sonnet-5-5", "gemini-3-pro"]),
    excerpt: `# Error handling and HTTP status codes

How a server answers when something goes wrong, and how a client reads the answer: safe messages, the right status code, no leaked internals. Follow it whenever you write or change an API route, a form action, a server function or the client code that calls them.

- **The codebase wins.** If the project already has an error handler or a response shape, extend it, don't mix two, and mention the difference.
- **The status code is the signal; the body only adds detail.** Never respond \`200 OK\` with a failure inside the body (\`{ "success": false }\`).
- **One central place.** Errors are translated by a central handler or helper, so no route can forget to.
- **Re-read this file in long sessions.** If the conversation has been compacted or summarised, or you've been working for a long stretch, re-read this file before the next change and check your work against it.`,
    outputExamples: [],
  },
  {
    slug: "ai-discoverability-geo",
    fileName: "ai-discoverability-geo.md",
    category: "conventions",
    kind: "prompt",
    version: 1,
    author: "@mdstore",
    priceUsd: 0,
    lineCount: 91,
    context_tokens: 1100,
    worksWith: ["Claude Code"],
    tested_models: build_tested_models(
      ["gemini-3-pro", "claude-opus-5-5"],
      ["claude-sonnet-5-5", "gpt-5-1", "gemini-3-flash"],
    ),
    excerpt: `# AI discoverability

How to make a public website easy for AI assistants to find, read and quote. Follow it when you build or change a public site: its rendering, \`llms.txt\`, \`robots.txt\`, sitemap, structured data and the way its pages are written.

- **The codebase wins.** If the site already generates a sitemap or \`robots.txt\`, extend that, don't add a second one, and mention the difference.
- **Build for three things only:** being in the models' training data, being found by their live search, and being easy to read and quote. Skip speculative formats.
- **Generate, don't hand-write.** Files that list the site's pages come from the same data that renders the pages, so they never go stale.
- **Re-read this file in long sessions.** If the conversation has been compacted or summarised, or you've been working for a long stretch, re-read this file before the next change and check your work against it.`,
    outputExamples: [],
  },
  {
    slug: "security-validation-authorization",
    fileName: "security-validation-authorization.md",
    category: "conventions",
    kind: "prompt",
    version: 1,
    author: "@mdstore",
    priceUsd: 0,
    lineCount: 54,
    context_tokens: 1300,
    worksWith: ["Claude Code"],
    tested_models: build_tested_models(
      ["claude-fable-5-2"],
      ["claude-opus-5-5", "claude-sonnet-5-5", "gpt-5-1", "gemini-3-pro"],
    ),
    excerpt: `# Server security: validation and authorization

How to protect server code that handles input, accounts and data: check every input on the server, check that the caller may do exactly what they ask, and keep secrets out of the repository and the client. Follow it whenever you write or review an API route, a form action, a server function, a file upload or anything that reads or changes protected data.

- **The codebase wins.** If the project already has a validation layer or an authorization guard, extend it, don't mix two, and mention the difference.
- **Client checks are only UX.** Anyone can bypass a form attribute, a disabled button or a hidden menu item with devtools, \`curl\` or a modified client. The server decides.
- **Deny by default.** An endpoint is closed unless a rule explicitly allows the caller in.
- **Re-read this file in long sessions.** If the conversation has been compacted or summarised, or you've been working for a long stretch, re-read this file before the next change and check your work against it.`,
    outputExamples: [],
  },
  {
    slug: "page-titles",
    fileName: "page-titles.md",
    category: "frontend",
    kind: "prompt",
    version: 1,
    author: "@mdstore",
    priceUsd: 0,
    lineCount: 60,
    context_tokens: 750,
    worksWith: ["Claude Code"],
    tested_models: build_tested_models(["claude-haiku-5-5", "gpt-5-mini"], ["claude-sonnet-5-5", "gemini-3-flash"]),
    excerpt: `# Page titles

How to give every page a meaningful, unique title. Follow it whenever you create a page or a route, change what a page shows, or set up the title mechanism of a project.

- **The codebase wins.** If the project already has a title template or helper, extend it, don't mix two, and mention the difference.
- **Never ship a default title.** Not the framework default, not an empty title, not a filename, and not the same title on every route.
- **Write in the user's language,** in plain sentence or title case, with no keyword stuffing.
- **Re-read this file in long sessions.** If the conversation has been compacted or summarised, or you've been working for a long stretch, re-read this file before the next change and check your work against it.`,
    outputExamples: [],
  },
  {
    slug: "routing-and-404",
    fileName: "routing-and-404.md",
    category: "frontend",
    kind: "prompt",
    version: 1,
    author: "@mdstore",
    priceUsd: 0,
    lineCount: 60,
    context_tokens: 1050,
    worksWith: ["Claude Code"],
    tested_models: build_tested_models(["claude-sonnet-5-5"], ["claude-opus-5-5", "claude-haiku-5-5", "gpt-5-1"]),
    excerpt: `# Routing, 404 pages and safe redirects

How to name routes, handle unknown URLs, redirect safely and protect privileged pages. Follow it whenever you add or rename a route, build a not-found or no-access page, write a redirect, or guard a page by role.

- **The codebase wins.** If the project already has route guards or an error page, extend them, don't mix two, and mention the difference.
- **Client guards are only UX.** Every privileged page and endpoint also checks authentication and role on the server.
- **Never leave the user on a blank screen,** a spinner or a raw error.
- **Re-read this file in long sessions.** If the conversation has been compacted or summarised, or you've been working for a long stretch, re-read this file before the next change and check your work against it.`,
    outputExamples: [],
  },
  {
    slug: "button-kinds",
    fileName: "button-kinds.md",
    category: "frontend",
    kind: "prompt",
    version: 1,
    author: "@mdstore",
    priceUsd: 0,
    lineCount: 57,
    context_tokens: 1000,
    worksWith: ["Claude Code"],
    tested_models: build_tested_models(
      ["claude-sonnet-5-5", "gpt-5-1"],
      ["claude-opus-5-5", "claude-haiku-5-5", "gemini-3-pro"],
    ),
    excerpt: `# Button kinds

How to decide what a button looks like by the job it does. Follow it whenever you create or restyle a button, or add an action to a page.

- **The codebase wins.** If the project already has button components, use them, don't mix two sets, and mention the difference.
- **Pick the kind first; the look follows.** A button's kind comes from the job it does, not from where it sits.
- **One component per kind.** Each kind lives in its own component, so changing a kind changes it everywhere.
- **Re-read this file in long sessions.** If the conversation has been compacted or summarised, or you've been working for a long stretch, re-read this file before the next change and check your work against it.`,
    outputExamples: [],
  },
  {
    slug: "color-and-ui-system",
    fileName: "color-and-ui-system.md",
    category: "frontend",
    kind: "prompt",
    version: 1,
    author: "@mdstore",
    priceUsd: 0,
    lineCount: 64,
    context_tokens: 1550,
    worksWith: ["Claude Code"],
    tested_models: build_tested_models(
      ["claude-opus-5-5", "gemini-3-pro"],
      ["claude-sonnet-5-5", "gpt-5-1", "gemini-3-flash"],
    ),
    excerpt: `# Colour system

How to build a colour palette that expresses visual hierarchy: what the eye should see first. Follow it whenever you define colours, a theme or dark mode, choose surfaces and elevation, or colour a status message.

- **The codebase wins.** If the project already has a palette or tokens, extend them, don't mix two, and mention the difference.
- **Colours are tokens.** Every colour is a custom property defined once on \`:root\`, and referenced by token. No raw hex values inside components.
- **Contrast is not optional.** Text and controls meet WCAG 2.1 AA.
- **Re-read this file in long sessions.** If the conversation has been compacted or summarised, or you've been working for a long stretch, re-read this file before the next change and check your work against it.`,
    outputExamples: [],
  },
  {
    slug: "web-visual-design-and-images",
    fileName: "web-visual-design-and-images.md",
    category: "frontend",
    kind: "prompt",
    version: 1,
    author: "@mdstore",
    priceUsd: 0,
    lineCount: 62,
    context_tokens: 1900,
    worksWith: ["Claude Code"],
    tested_models: build_tested_models(
      ["claude-fable-5-2", "claude-opus-5-5"],
      ["claude-sonnet-5-5", "gpt-5-1", "gemini-3-pro"],
    ),
    excerpt: `# Web visual design and images

How to decide what a web page looks like and how it communicates, from its audience and goal down to its images. Follow it whenever you design or restyle a page, a section or a component, or add images to one.

- **The codebase wins.** If the project already has a design system, tokens or a visual style, extend them, don't mix two, and mention the difference.
- **Start from the audience and the goal,** not from a style. Every decision serves the action the page should drive or the emotion it should evoke.
- **Contrast is not optional.** Text and controls meet WCAG 2.1 AA.
- **Re-read this file in long sessions.** If the conversation has been compacted or summarised, or you've been working for a long stretch, re-read this file before the next change and check your work against it.`,
    outputExamples: [],
  },
  {
    slug: "landing-and-hero-sections",
    fileName: "landing-and-hero-sections.md",
    category: "frontend",
    kind: "prompt",
    version: 1,
    author: "@mdstore",
    priceUsd: 0,
    lineCount: 52,
    context_tokens: 1000,
    worksWith: ["Claude Code"],
    tested_models: build_tested_models(
      ["claude-opus-5-5"],
      ["claude-sonnet-5-5", "gpt-5-1", "gemini-3-pro", "gemini-3-flash"],
    ),
    excerpt: `# Landing pages and hero sections

How to build a hero that explains the site at first sight, and the images and trust cues around it. Follow it whenever you create or change a landing page, a home page or the first screen of any page that has to convince a visitor.

- **The codebase wins.** If the project already has a hero or landing structure, extend it, don't mix two, and mention the difference.
- **Say it plainly.** The first screen tells a stranger what this is, in words they understand, before it tries to impress.
- **Nothing in the first view is cut off.** Text and calls to action always stay whole and readable, on tall and short screens alike.
- **Re-read this file in long sessions.** If the conversation has been compacted or summarised, or you've been working for a long stretch, re-read this file before the next change and check your work against it.`,
    outputExamples: [],
  },
  {
    slug: "api-route-handlers",
    fileName: "api-route-handlers.md",
    category: "conventions",
    kind: "prompt",
    version: 1,
    author: "@mdstore",
    priceUsd: 0,
    lineCount: 62,
    context_tokens: 850,
    worksWith: ["Claude Code"],
    tested_models: build_tested_models(
      ["claude-sonnet-5-5", "gpt-5-1"],
      ["claude-opus-5-5", "claude-haiku-5-5", "gemini-3-pro"],
    ),
    excerpt: `# API route handlers: one purpose per handler

How to organise API endpoints so that each one does one job, with its own rules and its own guard. Follow it whenever you add an endpoint, change what an existing one does, or are tempted to add a flag, a mode or a branch to a handler.

- **The codebase wins.** If the project already organises its handlers a different way, follow it, don't mix two, and mention the difference.
- **One handler per purpose,** not one per HTTP method. A resource may have several handlers for the same method when they serve different purposes.
- **Thin handlers.** Shared logic lives in server utilities, not in copies of a handler.
- **Re-read this file in long sessions.** If the conversation has been compacted or summarised, or you've been working for a long stretch, re-read this file before the next change and check your work against it.`,
    outputExamples: [],
  },
  {
    slug: "classes-for-complex-objects",
    fileName: "classes-for-complex-objects.md",
    category: "conventions",
    kind: "prompt",
    version: 1,
    author: "@mdstore",
    priceUsd: 0,
    lineCount: 77,
    context_tokens: 1000,
    worksWith: ["Claude Code"],
    tested_models: build_tested_models(["claude-opus-5-5"], ["claude-fable-5-2", "claude-sonnet-5-5", "gpt-5-1"]),
    excerpt: `# Classes for complex objects

When to model an object as a class, and what goes inside it, so its rules live in one place. Follow it whenever you build something that carries its own rules and behaviour, such as a booking, a user, a form or a loading state, and not only data.

- **The codebase wins.** If the project already models these objects another way, follow it, don't mix two, and mention the difference.
- **Behaviour decides.** Reach for a class when the object has rules that would otherwise be duplicated. Plain data stays a plain type.
- **Readability beats ceremony.** When a class and the simplest readable solution conflict, choose the simplest.
- **Re-read this file in long sessions.** If the conversation has been compacted or summarised, or you've been working for a long stretch, re-read this file before the next change and check your work against it.`,
    outputExamples: [],
  },
  {
    slug: "naming-conventions",
    fileName: "naming-conventions.md",
    category: "conventions",
    kind: "prompt",
    version: 1,
    author: "@mdstore",
    priceUsd: 0,
    lineCount: 64,
    context_tokens: 1000,
    worksWith: ["Claude Code"],
    tested_models: build_tested_models(
      ["claude-haiku-5-5", "gpt-5-mini", "gemini-3-flash"],
      ["claude-sonnet-5-5", "claude-opus-5-5"],
    ),
    excerpt: `# Naming variables and functions

How to name things so a developer understands what a variable holds or what a function does at first sight. Follow it whenever you create or rename a variable, a function, a handler, a prop or a field.

- **The codebase wins.** If the project already follows a different naming convention, keep it, don't mix the two, and mention the difference.
- **Name for a stranger.** Someone opening the file for the first time should know what a variable stores, or what a function is for, without reading its body or tracing where it is used.
- **Be as brief as clarity allows.** A long name is better than an unclear one, but the shortest clear name is best.
- **Re-read this file in long sessions.** If the conversation has been compacted or summarised, or you've been working for a long stretch, re-read this file before the next change and check your work against it.`,
    outputExamples: [],
  },
  {
    slug: "css-layout-and-spacing",
    fileName: "css-layout-and-spacing.md",
    category: "frontend",
    kind: "prompt",
    version: 1,
    author: "@mdstore",
    priceUsd: 0,
    lineCount: 63,
    context_tokens: 1100,
    worksWith: ["Claude Code"],
    tested_models: build_tested_models(
      ["claude-sonnet-5-5", "gemini-3-pro"],
      ["claude-opus-5-5", "gpt-5-1", "claude-haiku-5-5"],
    ),
    excerpt: `# CSS layout and spacing

How to arrange elements so the layout is set in one place, spacing comes from tokens, and a reset removes the browser's defaults. Follow it whenever you write or review CSS for a page, a component or a layout.

- **The codebase wins.** If the project already has a layout or spacing convention, follow it, don't mix the two, and mention the difference.
- **The parent arranges its children;** the children never position themselves.
- **No raw spacing values** inside components. Every spacing value is a token.
- **Re-read this file in long sessions.** If the conversation has been compacted or summarised, or you've been working for a long stretch, re-read this file before the next change and check your work against it.`,
    outputExamples: [],
  },
  {
    slug: "fluid-design-and-container-queries",
    fileName: "fluid-design-and-container-queries.md",
    category: "frontend",
    kind: "prompt",
    version: 1,
    author: "@mdstore",
    priceUsd: 0,
    lineCount: 58,
    context_tokens: 1550,
    worksWith: ["Claude Code"],
    tested_models: build_tested_models(["claude-opus-5-5", "claude-sonnet-5-5"], ["gpt-5-1", "gemini-3-pro"]),
    excerpt: `# Fluid design and container queries

How to make a layout scale continuously with the screen and with the space a component sits in, instead of jumping between breakpoints. Follow it whenever you size a layout, write responsive CSS, or build a component that can be placed in spaces of different widths.

- **The codebase wins.** If the project already has a responsive approach, follow it, don't mix the two, and mention the difference.
- **Fluid over breakpoints.** Let sizes, spacing and tracks scale, and add a media query only for a structural change that fluid values can't express.
- **Fluid in both dimensions.** The viewport has a width and a height, and the layout must hold for every combination.
- **Re-read this file in long sessions.** If the conversation has been compacted or summarised, or you've been working for a long stretch, re-read this file before the next change and check your work against it.`,
    outputExamples: [],
  },
];
