@AGENTS.md

# mdstore

## Project

**mdstore** is a hub for developing coding prompts. Developers share the prompts they author, and the community gets access to high-quality, tested ones. The prompts are packaged as plain Markdown (`.md`) files: `CLAUDE.md` / `AGENTS.md` instructions, Cursor rules, custom commands and agent playbooks for AI coding tools (Claude Code, Cursor, GitHub Copilot, Aider…). Selling prompts is one of the core features, not the main pitch: the home page H1 and lead lead with developing and sharing, not buying.

- **Buyers** browse listings by category, read a free preview of each file (its first lines), buy it once, and drop the `.md` into their repo. Purchases include future versions of the file.
- **Sellers** publish the prompts they have refined, set their own price, choose the preview length, list the tools they tested with and get paid on every sale.

Current state: the **landing page** (`/`), a **detail page per listing** (`/prompts/[slug]`, linked from each card's title and from the preview dialog), plus the branded 404. Listings come from static data (`src/data/prompts.ts`); the full `.md` products live in `content/prompts/` (`global.md`, framework-agnostic web conventions, offered free; `nextjs-structure.md`, Next.js App Router project structure, paid). Free listings (`priceUsd: 0`) can be downloaded from `/prompts/[slug]/download`; paid ones get a `403` there. There is no auth, checkout, seller onboarding or API yet. "Request seller access" opens a `mailto:` to the placeholder inbox in `src/lib/site.ts`.

## Differentiators

What sets mdstore apart from other prompt and skill marketplaces. Only output previews have a place in the UI so far (the "Output examples" section on each listing page, with placeholders until `outputExamples` has screenshots); design listings, data models and pages so they can carry the rest.

- **Output previews.** Besides the free excerpt of the file, each listing shows what the prompt actually produces: a preview of its output, ideally several examples. Buyers judge a prompt by its results, not only by reading its instructions.
- **Very specific files.** Listings target one narrow job (e.g. only improving the UI/UX of a form) rather than broad, catch-all instructions, so buyers know exactly what they get. Broader foundation files such as `global.md` are the exception, meant as the starting instructions for a project.
- **Supported technologies.** Each listing states which technologies its instructions support (frameworks, languages, styling approaches), alongside the AI tools it was tested with (`worksWith`).

## Stack

- Next.js 16 (App Router, Turbopack, `cacheComponents` and `partialPrefetching` enabled), React 19, TypeScript (strict).
- Styling: CSS Modules per component + global design tokens in `src/styles/globals.css`. Tailwind v4 is installed and imported in `globals.css` (it also provides the preflight reset), but components are styled with CSS Modules.
- Fonts via `next/font/google`: **Bricolage Grotesque** (`--font-display`, page/section headings), **Geist** (`--font-body`, body copy, controls and modal headings), **Geist Mono** (`--font-code`, file names and Markdown excerpts).
- Node is pinned with mise; run commands through the mise-activated shell.

## Commands

- `npm run dev`: dev server at `http://localhost:3000`
- `npm run build`: production build (also type-checks)
- `npm run start`: serve the production build
- `npm run lint`: ESLint

## Structure

```text
src/
├─ app/                      routes only
│  ├─ layout.tsx             root layout: fonts, metadata title template, header + footer
│  ├─ page.tsx               landing page (composes the homepage sections)
│  ├─ prompts/[slug]/page.tsx
│  │                         thin shell: reads `params` only inside <Suspense> (in
│  │                         PromptDetail) so the shared App Shell stays instant;
│  │                         listing detail: header (h1 title + h2 tagline), summary,
│  │                         meant for, highlights, purchase card, output examples,
│  │                         free preview (+ "Show the full file" for free listings only;
│  │                         paid files must never be read into a page), suggested use
│  │                         (prerendered for every slug via generateStaticParams)
│  ├─ prompts/[slug]/download/route.ts
│  │                         serves a free listing's .md as an attachment
│  └─ not-found.tsx          branded 404 for every unmatched URL (real 404 status)
├─ components/
│  ├─ global/                shared by several pages: SiteHeader, SiteFooter, SiteLogo,
│  │                         MobileMenu, PrimaryButton, SecondaryButton, SkeletonBlock,
│  │                         navLinks
│  ├─ homepage/              landing-only sections: Hero, FeaturedPrompts, PromptCard,
│  │                         HowItWorks, WhyMarkdown, SellerCta, Faq
│  ├─ prompt-detail/         used only by /prompts/[slug]: PromptDetail (the page body),
│  │                         InlineCode (renders `backticks` in listing copy as <code>),
│  │                         PromptDetailSkeleton (its Suspense fallback), OutputExamples
│  │                         (screenshots from `outputExamples`, placeholders while empty)
│  └─ modals/                PromptPreviewDialog (dismissible)
├─ data/                     static catalogues: prompts.ts (listings), faq.ts
├─ lib/                      site.ts (app name, title format, contact), formatPrice.ts,
│                            promptFiles.ts (reads a content/prompts/ file; cached),
│                            getPromptOrNotFound.ts (slug params → listing or 404)
├─ styles/globals.css        :root tokens, reset, typography, shared + modal classes
└─ proxy.ts                  rewrites unknown /prompts/[slug] to the 404 page, so they get a
                             real 404 status (with Cache Components the page streams before
                             notFound() runs, and dynamicParams is unavailable)
content/prompts/             the full .md files sold on the store (keep excerpt/lineCount
                             in src/data/prompts.ts in sync)
public/                      static files served as-is (favicon.ico, images, robots.txt);
                             never put static files in src/app/
```

- Imports use the `@/*` alias (→ `src/*`), never `../`. Each component's `*.module.css` sits next to it.
- `next.config.ts` runs the Tailwind Turbopack loader on global CSS only; the rule excludes `*.module.css`, otherwise CSS Module class names resolve to `undefined`.

## Conventions specific to this project

- **Colours** live only as tokens on `:root` in `globals.css` (light + `prefers-color-scheme: dark`). Roles: `--color-background` (tinted off-white / deep navy), `--color-primary` (brand indigo, header/footer/key CTAs), `--color-secondary` (lavender surfaces), `--color-tertiary` (coral, reserved for warnings/toasts), plus ink, surface, border, code and focus tokens. Never use raw hex in components.
- **Sizes**: font sizes use the `--text-*` clamp tokens; spacing uses the `--space-*` clamp tokens; page width uses `--content-width`. Sections are separated with `gap` on `main`, not margins.
- **Button kinds**: `PrimaryButton` (purchase CTAs: hero "Browse prompts"), `SecondaryButton` (acquisition/contact: "Start selling", "Request seller access"), tertiary text buttons (card "Preview"), interface controls (mobile menu toggle).
- **Modals**: `PromptPreviewDialog` is a dismissible native `<dialog>` (Escape, backdrop click, `.modal-close-floating` X). Shared modal classes are in `globals.css`.
- **Titles**: format `Page | mdstore`, defined once in `src/lib/site.ts` (`titleTemplate`) and applied in the root layout; the home page uses `title.absolute` to lead with the brand.
- **Behavioural state** uses attributes, not classes (`aria-pressed` on category filters, `data-size` on buttons, `data-token` in code previews).
- Keep this file up to date as routes (listing pages, checkout, seller dashboard, auth) and the backend are added.
