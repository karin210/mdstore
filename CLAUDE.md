@AGENTS.md

# mdstore

## Project

**mdstore** is a hub for developing coding prompts. Developers share the prompts they author, and the community gets access to high-quality, tested ones. The prompts are packaged as plain Markdown (`.md`) files: `CLAUDE.md` / `AGENTS.md` instructions, Cursor rules, custom commands and agent playbooks for AI coding tools (Claude Code, Cursor, GitHub Copilot, Aider…). Selling prompts is one of the core features, not the main pitch: the home page H1 and lead lead with developing and sharing, not buying.

- **Buyers** browse listings by category, read a free preview of each file (its first lines), buy it once, and drop the `.md` into their repo. Purchases include future versions of the file.
- **Authors** post the prompts they have refined from `/upload` ("Upload your prompts"): signed-in users fill in a form with what the detail page shows (title, tagline, summary, category, author handle, meant for, highlights, suggested use, tools tested with), the `.md` file and the free-preview length. The post is published at once on its own `/prompts/[slug]` page. Posting is free for now; paid posts come with checkout.

Current state: the **landing page** (`/`), a **detail page per prompt** (`/prompts/[slug]`), the **upload page** (`/upload`, posting form at the bottom), the **login page** (`/login`, sign-up / sign-in tabs) and the branded 404. Prompts come from two sources: the curated catalogue (`src/data/prompts.ts` + copy in the message catalogue; the full `.md` products live in `content/prompts/`: `global.md`, framework-agnostic web conventions, free; `nextjs-structure.md`, Next.js App Router project structure, paid; `dev-tools-advisor.md`, agent playbook that recommends dev tools and stack, free; and eighteen narrow deep-dives, all free: `commit-attribution.md`, `authentication-forms.md`, `modals.md`, `loading-states.md`, `error-handling-and-http-status.md`, `ai-discoverability-geo.md`, `security-validation-authorization.md`, `page-titles.md`, `routing-and-404.md`, `button-kinds.md`, `color-and-ui-system.md`, `web-visual-design-and-images.md`, `landing-and-hero-sections.md`, `api-route-handlers.md`, `classes-for-complex-objects.md`, `naming-conventions.md`, `css-layout-and-spacing.md` and `fluid-design-and-container-queries.md`. Most of them expand a topic that `global.md` covers in a short section, on purpose: each listing is one narrow job, and `global.md` stays the starting file) and the `posted_prompts` table in Supabase (user posts, always free). Product files must stay agnostic of the AI agent, the tooling and the developer's stack unless the listing is explicitly about one. Free prompts can be downloaded from `/prompts/[slug]/download`; paid ones get a `403` there. Posted prompts don't appear on the landing page grid yet (only on their own page). There is no checkout yet.

## Differentiators

What sets mdstore apart from other prompt and skill marketplaces. Only output previews have a place in the UI so far (the "Output examples" section on each listing page, with placeholders until `outputExamples` has screenshots); design listings, data models and pages so they can carry the rest.

- **Output previews.** Besides the free excerpt of the file, each listing shows what the prompt actually produces: a preview of its output, ideally several examples. Buyers judge a prompt by its results, not only by reading its instructions.
- **Very specific files.** Listings target one narrow job (e.g. only improving the UI/UX of a form) rather than broad, catch-all instructions, so buyers know exactly what they get. Broader foundation files such as `global.md` are the exception, meant as the starting instructions for a project.
- **Supported technologies.** Each listing states which technologies its instructions support (frameworks, languages, styling approaches), alongside the AI tools it was tested with (`worksWith`).

## Stack

- Next.js 16 (App Router, Turbopack, `cacheComponents` and `partialPrefetching` enabled), React 19, TypeScript (strict).
- Styling: CSS Modules per component + global design tokens in `src/styles/globals.css`. No CSS framework: the reset at the top of `globals.css` (`@layer reset`, adapted from Tailwind's preflight) removes default margins, heading sizes, list bullets and control styling, and every unlayered rule overrides it. Tailwind was removed because only its reset was used.
- Fonts via `next/font/google`: **Bricolage Grotesque** (`--font-display`, page/section headings), **Geist** (`--font-body`, body copy, controls and modal headings), **Geist Mono** (`--font-code`, file names and Markdown excerpts).
- Supabase (`@supabase/ssr` + `@supabase/supabase-js`): email/password auth and the `posted_prompts` table. Settings in `.env.local` (see `.env.example`); the schema and row-level security policies are in `supabase/migrations/`. Without the env vars the site still builds and runs, signed out, with posting unavailable.
- Zod for the validation schemas shared by forms (client) and server actions.
- Node 24, pinned in `mise.toml` so every machine and CI use the same version; run commands through the mise-activated shell. `@types/node` follows the same major.
- npm (lockfile in the repo): working setup, no gain in switching.
- ESLint 9 with `eslint-config-next` (flat config): keeps the Next-specific rules (core web vitals, React hooks). Stay on 9 until the bundled plugins list ESLint 10 as a peer.
- Prettier, pinned in the project (`.prettierrc.json`: `printWidth: 120`, LF), with `eslint-config-prettier` last in the ESLint config: same output in Zed, the CLI and CI. Chosen over Biome to keep the Next lint rules. `content/prompts/` is ignored because those files are the product, byte for byte. `.gitattributes` keeps LF on Windows.
- Vitest 5 for unit tests of plain TypeScript (validation rules, form classes, helpers), as `src/**/*.test.ts` next to the code, Node environment; `@/` resolves through Vite's built-in `resolve.tsconfigPaths`. Async Server Components need E2E tests (Playwright) instead, per the Next docs.
- TypeScript 5: stay off TypeScript 7 until it ships a JavaScript API (the `next` editor plugin needs it).
- Supabase CLI (dev dependency, config in `supabase/config.toml`): applies migrations and generates the table types.
- Full reasoning, traps and pending work for the tooling: `docs/dev-tooling.md`.
- CI: `.github/workflows/ci.yml` runs lint, format check, tests and build on pushes to `main`/`dev` and on pull requests (Node from `mise.toml`, no secrets needed).

## Commands

- `npm run dev`: dev server at `http://localhost:3000`
- `npm run build`: production build (also type-checks)
- `npm run start`: serve the production build
- `npm run lint`: ESLint
- `npm run format` / `npm run format:check`: write / check Prettier formatting
- `npm test` / `npm run test:watch`: Vitest once / in watch mode
- `npm run db:push`: apply `supabase/migrations/` to the linked project (after `npx supabase login` and `npx supabase link --project-ref <ref>`)
- `npm run db:types`: regenerate `src/lib/supabase/database.types.ts` from the linked project

## Structure

```text
src/
├─ app/[locale]/             routes only (en unprefixed, es under /es; see src/i18n/routing.ts)
│  ├─ layout.tsx             root layout: fonts, metadata title template, header + footer
│  ├─ page.tsx               landing page (composes the homepage sections)
│  ├─ upload/page.tsx        "Upload your prompts": hero, benefits, tips, steps, posting form
│  ├─ login/page.tsx         sign-up / sign-in tabs (LoginPanel inside <Suspense>)
│  ├─ auth/confirm/route.ts  confirmation-email landing (token_hash or PKCE code)
│  ├─ prompts/[slug]/page.tsx
│  │                         thin shell: reads `params` only inside <Suspense> (in
│  │                         PromptDetail) so the shared App Shell stays instant;
│  │                         listing detail: header (h1 title + h2 tagline), summary,
│  │                         meant for, highlights, purchase card, output examples,
│  │                         tested models (by family, recommended ones highlighted, plus a
│  │                         cost table), free preview (+ "Show the full file" for free listings only;
│  │                         paid files must never be read into a page), suggested use
│  │                         (catalogue slugs prerendered via generateStaticParams; posted
│  │                         prompts render on first request from cached Supabase reads)
│  ├─ prompts/[slug]/download/route.ts
│  │                         serves a free prompt's .md as an attachment
│  └─ not-found.tsx          branded 404 for every unmatched URL (real 404 status)
├─ components/
│  ├─ global/                shared by several pages: SiteHeader, SiteFooter, SiteLogo,
│  │                         MobileMenu, AccountControl (sign in / sign out), PrimaryButton,
│  │                         SecondaryButton, SubmitButton, FormAlert, SkeletonBlock, icons,
│  │                         navLinks
│  ├─ homepage/              landing-only sections: Hero, FeaturedPrompts, PromptCard,
│  │                         HowItWorks, WhyMarkdown, UploadCta, Faq; the page reads as one
│  │                         Markdown file: homeSections (outline order), HomeOutline (desktop
│  │                         rail + mobile status bar with an Outline popover), NextSection
│  │                         ("Next ## …" link ending each section), MarkdownField (hero's
│  │                         WebGL backdrop, lazy, see src/lib/markdownFieldRenderer.ts)
│  ├─ upload/                used only by /upload: its sections, PostPromptSection (session
│  │                         check in <Suspense>), PostPromptForm, PostFormField
│  ├─ login/                 LoginPanel (tabs, owns mode + submission), SignUpForm, SignInForm,
│  │                         EmailField, PasswordField, HelperChunks
│  ├─ prompt-detail/         used only by /prompts/[slug]: PromptDetail (the page body),
│  │                         InlineCode (renders `backticks` in listing copy as <code>),
│  │                         PromptDetailSkeleton (its Suspense fallback), OutputExamples
│  │                         (screenshots from `outputExamples`, placeholders while empty),
│  │                         TestedModels (the `tested_models` of a listing, from the
│  │                         `ai_models` registry in src/data/aiModels.ts)
│  └─ modals/                PromptPreviewDialog (dismissible)
├─ data/                     static catalogues: prompts.ts (listings), aiModels.ts (model
│                            families, names and prices; the models and every listing's
│                            tested models are invented placeholders), faq.ts
├─ lib/                      site.ts (app name, title format, contact), formatPrice.ts, estimateContextTokens.ts (the
│                            "Context" figure on a listing; a test keeps `context_tokens` in
│                            prompts.ts in step with the files),
│                            promptFiles.ts (reads a content/prompts/ file; cached),
│                            promptView.ts (what a prompt page shows, from either source),
│                            getPromptOrNotFound.ts (slug params → prompt or 404),
│                            safeRedirect.ts, slugify.ts, supabase/ (env, browser client),
│                            validation/ (credentials + prompt-post rules, shared with the
│                            server), forms/ (BaseForm, SignInForm/SignUpForm, PromptPostForm)
├─ server/                   server-only code ("server-only" import): supabase/ clients and
│                            session refresh, auth/ (actions, getSignedInUser),
│                            prompts/ (post action, cached posted-prompt reads, view resolver)
├─ styles/globals.css        :root tokens, reset, typography, shared form + modal classes
└─ proxy.ts                  rewrites unknown /prompts/[slug] (not in the catalogue, not an
                             approved post, and not a pending post of the signed-in author or an
                             admin) to the 404 page for a real 404 status, runs next-intl, and
                             refreshes the Supabase session cookies on every request
content/prompts/             the full .md files of the curated catalogue (keep excerpt/lineCount
                             in src/data/prompts.ts in sync)
supabase/migrations/         SQL for the posted_prompts table, its checks and RLS policies
public/                      static files served as-is (favicon.ico, images, robots.txt);
                             never put static files in src/app/
```

- Imports use the `@/*` alias (→ `src/*`), never `../`. Each component's `*.module.css` sits next to it.

## Conventions specific to this project

- **Colours** live only as tokens on `:root` in `globals.css` (light + `prefers-color-scheme: dark`). Roles: `--color-background` (tinted off-white / deep navy), `--color-primary` (brand indigo, header/footer/key CTAs), `--color-secondary` (lavender surfaces), `--color-tertiary` (coral, reserved for warnings/toasts), plus ink, surface, border, code and focus tokens. Never use raw hex in components.
- **Sizes**: font sizes use the `--text-*` clamp tokens; spacing uses the `--space-*` clamp tokens; page width uses `--content-width`. Sections are separated with `gap` on `main`, not margins.
- **Button kinds**: `PrimaryButton` (purchase CTAs: hero "Browse prompts"), `SubmitButton` (form submits, stays enabled while invalid, disabled only in flight), `SecondaryButton` (acquisition/contact: "Upload your prompt", "Sign in to post"), tertiary text buttons (card "Preview", "Sign out"), interface controls (mobile menu toggle).
- **Auth**: only signed-in users can post; the server action re-checks the session (`get_signed_in_user`, verified with `getClaims()`) and RLS only accepts rows whose `author_id` is the caller. The header's `AccountControl` refreshes the page on sign-in/sign-out, so the upload form disappears when the session ends.
- **Forms** follow the global auth-form rules: validation rules live once in `src/lib/validation/` (client checks + Zod schemas for the server), form state lives in `src/lib/forms/` classes, guidance is inline under each field, and submit focuses the first wrong field. Shared field styles (`.form-input`, `.form-hint`, `.form-guidance`, `data-mark`, `data-state`) are in `globals.css`.
- **Naming**: camelCase for variables, functions, props and object keys; PascalCase for components and types; UPPER_SNAKE_CASE for module constants. snake_case appears only where an outside system owns the name: Supabase column names (`PostedPromptRow`, the insert in `src/server/prompts/actions.ts`, `DETAIL_COLUMNS`), Supabase error codes and parameters (`token_hash`, `email_change`) and cookie names (`mdstore_locale`). Until `npm run db:types` is wired into the clients, the insert's column names are not type-checked, so keep them in sync with the migration by hand.
- **Modals**: `PromptPreviewDialog` is a dismissible native `<dialog>` (Escape, backdrop click, `.modal-close-floating` X). Shared modal classes are in `globals.css`.
- **Titles**: format `Page | mdstore`, defined once in `src/lib/site.ts` (`titleTemplate`) and applied in the root layout; the home page uses `title.absolute` to lead with the brand.
- **Behavioural state** uses attributes, not classes (`aria-pressed` on category filters, `data-size` on buttons, `data-token` in code previews).
- Keep this file up to date as routes (listing pages, checkout, seller dashboard, auth) and the backend are added.
