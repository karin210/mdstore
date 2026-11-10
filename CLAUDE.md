@AGENTS.md

# mdstore

## Project

**mdstore** is a hub for developing coding prompts. Developers share the prompts they author, and the community gets access to high-quality, tested ones. The prompts are packaged as plain Markdown (`.md`) files: `CLAUDE.md` / `AGENTS.md` instructions, Cursor rules, custom commands and agent playbooks for AI coding tools (Claude Code, Cursor, GitHub Copilot, Aider…). Selling prompts is one of the core features, not the main pitch: the home page H1 and lead lead with developing and sharing, not buying.

- **Buyers** browse listings by category, read a free preview of each file (its first lines), buy it once, and drop the `.md` into their repo. Purchases include future versions of the file.
- **Authors** post the prompts they have refined from `/upload` ("Upload your prompts"): signed-in users fill in a form with what the detail page shows (title, tagline, summary, category, author handle, meant for, highlights, suggested use, tools tested with), the `.md` file and the free-preview length. The post is published at once on its own `/prompts/[slug]` page. Posting is free for now; paid posts come with checkout.

Current state: the **landing page** (`/`), a **detail page per prompt** (`/prompts/[slug]`), the **upload page** (`/upload`, posting form at the bottom), the **login page** (`/login`, sign-up / sign-in tabs) and the branded 404. Prompts come from two sources: the curated catalogue (`src/data/prompts.ts` + copy in the message catalogue; the full `.md` products live in `content/prompts/`: `global.md`, framework-agnostic web conventions, free; `nextjs-structure.md`, Next.js App Router project structure, paid; `dev-tools-advisor.md`, agent playbook that recommends dev tools and stack, free) and the `posted_prompts` table in Supabase (user posts, always free). Product files must stay agnostic of the AI agent, the tooling and the developer's stack unless the listing is explicitly about one. Free prompts can be downloaded from `/prompts/[slug]/download`; paid ones get a `403` there. Posted prompts don't appear on the landing page grid yet (only on their own page). There is no checkout yet.

## Differentiators

What sets mdstore apart from other prompt and skill marketplaces. Only output previews have a place in the UI so far (the "Output examples" section on each listing page, with placeholders until `outputExamples` has screenshots); design listings, data models and pages so they can carry the rest.

- **Output previews.** Besides the free excerpt of the file, each listing shows what the prompt actually produces: a preview of its output, ideally several examples. Buyers judge a prompt by its results, not only by reading its instructions.
- **Very specific files.** Listings target one narrow job (e.g. only improving the UI/UX of a form) rather than broad, catch-all instructions, so buyers know exactly what they get. Broader foundation files such as `global.md` are the exception, meant as the starting instructions for a project.
- **Supported technologies.** Each listing states which technologies its instructions support (frameworks, languages, styling approaches), alongside the AI tools it was tested with (`worksWith`).

## Stack

- Next.js 16 (App Router, Turbopack, `cacheComponents` and `partialPrefetching` enabled), React 19, TypeScript (strict).
- Styling: CSS Modules per component + global design tokens in `src/styles/globals.css`. Tailwind v4 is installed and imported in `globals.css` (it also provides the preflight reset), but components are styled with CSS Modules.
- Fonts via `next/font/google`: **Bricolage Grotesque** (`--font-display`, page/section headings), **Geist** (`--font-body`, body copy, controls and modal headings), **Geist Mono** (`--font-code`, file names and Markdown excerpts).
- Supabase (`@supabase/ssr` + `@supabase/supabase-js`): email/password auth and the `posted_prompts` table. Settings in `.env.local` (see `.env.example`); the schema and row-level security policies are in `supabase/migrations/`. Without the env vars the site still builds and runs, signed out, with posting unavailable.
- Zod for the validation schemas shared by forms (client) and server actions.
- Node is pinned with mise; run commands through the mise-activated shell.

## Commands

- `npm run dev`: dev server at `http://localhost:3000`
- `npm run build`: production build (also type-checks)
- `npm run start`: serve the production build
- `npm run lint`: ESLint

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
│  │                         free preview (+ "Show the full file" for free listings only;
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
│  │                         HowItWorks, WhyMarkdown, UploadCta, Faq
│  ├─ upload/                used only by /upload: its sections, PostPromptSection (session
│  │                         check in <Suspense>), PostPromptForm, PostFormField
│  ├─ login/                 LoginPanel (tabs, owns mode + submission), SignUpForm, SignInForm,
│  │                         EmailField, PasswordField, HelperChunks
│  ├─ prompt-detail/         used only by /prompts/[slug]: PromptDetail (the page body),
│  │                         InlineCode (renders `backticks` in listing copy as <code>),
│  │                         PromptDetailSkeleton (its Suspense fallback), OutputExamples
│  │                         (screenshots from `outputExamples`, placeholders while empty)
│  └─ modals/                PromptPreviewDialog (dismissible)
├─ data/                     static catalogues: prompts.ts (listings), faq.ts
├─ lib/                      site.ts (app name, title format, contact), formatPrice.ts,
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
└─ proxy.ts                  rewrites unknown /prompts/[slug] (neither catalogue nor posted) to
                             the 404 page for a real 404 status, runs next-intl, and refreshes
                             the Supabase session cookies on every request
content/prompts/             the full .md files of the curated catalogue (keep excerpt/lineCount
                             in src/data/prompts.ts in sync)
supabase/migrations/         SQL for the posted_prompts table, its checks and RLS policies
public/                      static files served as-is (favicon.ico, images, robots.txt);
                             never put static files in src/app/
```

- Imports use the `@/*` alias (→ `src/*`), never `../`. Each component's `*.module.css` sits next to it.
- `next.config.ts` runs the Tailwind Turbopack loader on global CSS only; the rule excludes `*.module.css`, otherwise CSS Module class names resolve to `undefined`.

## Conventions specific to this project

- **Colours** live only as tokens on `:root` in `globals.css` (light + `prefers-color-scheme: dark`). Roles: `--color-background` (tinted off-white / deep navy), `--color-primary` (brand indigo, header/footer/key CTAs), `--color-secondary` (lavender surfaces), `--color-tertiary` (coral, reserved for warnings/toasts), plus ink, surface, border, code and focus tokens. Never use raw hex in components.
- **Sizes**: font sizes use the `--text-*` clamp tokens; spacing uses the `--space-*` clamp tokens; page width uses `--content-width`. Sections are separated with `gap` on `main`, not margins.
- **Button kinds**: `PrimaryButton` (purchase CTAs: hero "Browse prompts"), `SubmitButton` (form submits, stays enabled while invalid, disabled only in flight), `SecondaryButton` (acquisition/contact: "Upload your prompt", "Sign in to post"), tertiary text buttons (card "Preview", "Sign out"), interface controls (mobile menu toggle).
- **Auth**: only signed-in users can post; the server action re-checks the session (`get_signed_in_user`, verified with `getClaims()`) and RLS only accepts rows whose `author_id` is the caller. The header's `AccountControl` refreshes the page on sign-in/sign-out, so the upload form disappears when the session ends.
- **Forms** follow the global auth-form rules: validation rules live once in `src/lib/validation/` (client checks + Zod schemas for the server), form state lives in `src/lib/forms/` classes, guidance is inline under each field, and submit focuses the first wrong field. Shared field styles (`.form-input`, `.form-hint`, `.form-guidance`, `data-mark`, `data-state`) are in `globals.css`.
- **Naming**: new code uses snake_case for variables and functions (global rule); older code still uses camelCase, so don't rename it piecemeal.
- **Modals**: `PromptPreviewDialog` is a dismissible native `<dialog>` (Escape, backdrop click, `.modal-close-floating` X). Shared modal classes are in `globals.css`.
- **Titles**: format `Page | mdstore`, defined once in `src/lib/site.ts` (`titleTemplate`) and applied in the root layout; the home page uses `title.absolute` to lead with the brand.
- **Behavioural state** uses attributes, not classes (`aria-pressed` on category filters, `data-size` on buttons, `data-token` in code previews).
- Keep this file up to date as routes (listing pages, checkout, seller dashboard, auth) and the backend are added.
