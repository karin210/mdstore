@AGENTS.md

# mdstore

## Project

**mdstore** is a hub for developing coding prompts. Developers share the prompts they author, and the community gets access to high-quality, tested ones. The prompts are packaged as plain Markdown (`.md`) files: `CLAUDE.md` / `AGENTS.md` instructions, Cursor rules, custom commands and agent playbooks for AI coding tools (Claude Code, Cursor, GitHub Copilot, Aider…). Selling prompts is one of the core features, not the main pitch: the home page H1 and lead lead with developing and sharing, not buying.

- **Buyers** browse listings by category, read a free preview of each file (its first lines), buy it once, and drop the `.md` into their repo. Purchases include future versions of the file.
- **Authors** post the prompts they have refined from `/upload` ("Upload your prompts"): signed-in users fill in a form with what the detail page shows (title, tagline, summary, category, author handle, meant for, highlights, suggested use, tools tested with), the `.md` file and the free-preview length. The post is published at once on its own `/prompts/[slug]` page. Posting is free for now; paid posts come with checkout.

Current state: the **landing page** (`/`), a **detail page per prompt** (`/prompts/[slug]`), the **upload page** (`/upload`, posting form at the bottom), the **login page** (`/login`, sign-up / sign-in tabs), the signed-in **profile** (`/profile`: account details, the five latest uploads with a link to all of them, and forms to change the username, email and password) and **my prompts** (`/my-prompts`: every post the user owns or co-authors, newest first), and the branded 404. Signed-out visitors of `/profile` and `/my-prompts` are redirected to `/login` by `src/proxy.ts`. Prompts come from two sources: the curated catalogue (`src/data/prompts.ts` + copy in the message catalogue; currently empty, so the full `.md` products would live in `content/prompts/`, which no longer exists) and the `posted_prompts` table in Supabase (user posts, always free). Product files must stay agnostic of the AI agent, the tooling and the developer's stack unless the listing is explicitly about one. Free prompts can be downloaded from `/prompts/[slug]/download`; paid ones get a `403` there. The landing page's "most popular prompts" grid shows up to six approved posts: highest average stars first, newest first among equal averages, then unrated posts newest first (so with no ratings, the six newest); the rule is the database function `popular_prompts()`, read by `src/server/prompts/popularPrompts.ts`. Catalogue listings aren't in it (they have no ratings or dates). Signed-in readers rate approved posts from 1 to 5 stars on the listing page ("Ratings" section; authors can't rate their own); the average and count show under the tagline and in the API. There is no checkout yet.

Every listing has a **kind** (`prompt_kinds` in `src/data/prompts.ts`, column `kind`, revisioned: `prompt`, `skill` or `agent`; authors choose it on the upload form) that decides how a developer gets it (a prompt is copied or downloaded; the CLI installs skills and agents), and a **version** (integer from 1, bumped by hand, by one, in the same commit that changes the catalogue file in `content/prompts/`; posts start at 1) that the CLI compares to find updates. Production: `siteConfig.url` in `src/lib/site.ts` (https://mdstore-seven.vercel.app), also the CLI's default server. How the feature works and how to change it: `docs/cli.md`; what it still needs: `docs/cli-pending.md`.

**Public JSON API** (`src/app/api/v1/`, read-only, no auth, English copy; the proxy skips `/api`; mapping in `src/server/prompts/promptApi.ts`; errors are `{ status, message }` JSON):

- `GET /api/v1/prompts?q=&category=`: catalogue and posted prompts as summaries (`slug, title, tagline, category, kind, version, priceUsd, fileName, author, rating`; `rating` is `{ average, count }`, null for catalogue listings).
- `GET /api/v1/prompts/[slug]`: the summary plus `sha256` (free prompts only, computed per request, never stored), `worksWith`, `lineCount`, `context_tokens`; 404 when unknown.
- `GET /api/v1/prompts/[slug]/file`: a free prompt's raw `.md` (`text/markdown`); 403 for paid, 404 when unknown.

**CLI** (`packages/cli`, npm workspace, package and bin `mdstore`, see its README): `npx mdstore add <slug> [--tool claude|cursor|copilot|opencode|codex|zed|aider|agents] [--path <file>] [--yes]`, `search`, `list`, `outdated`, `update [slug]`. Free skills and agents only (a prompt is refused: copy or download it). It installs by (kind, tool) from one table in `packages/cli/src/targets.ts` (the skills matrix of the root `cli.md`, project scope; only Claude Code has a known agents folder), always to a file of its own. Installs are recorded in `mdstore.lock.json` at the user's project root. Free skill and agent listing pages show its `npx mdstore add <slug>` line. The CLI keeps its own copy of the kind list; a test keeps it in step with `prompt_kinds` and the migrations.

## Differentiators

What sets mdstore apart from other prompt and skill marketplaces. Only output previews have a place in the UI so far (the "Output examples" section on each listing page, with placeholders until `outputExamples` has screenshots); design listings, data models and pages so they can carry the rest.

- **Output previews.** Besides the free excerpt of the file, each listing shows what the prompt actually produces: a preview of its output, ideally several examples. Buyers judge a prompt by its results, not only by reading its instructions.
- **Very specific files.** Listings target one narrow job (e.g. only improving the UI/UX of a form) rather than broad, catch-all instructions, so buyers know exactly what they get.
- **Supported technologies.** Each listing states which technologies its instructions support (frameworks, languages, styling approaches), alongside the AI tools it was tested with (`worksWith`).

## Stack

- Next.js 16 (App Router, Turbopack, `cacheComponents` and `partialPrefetching` enabled), React 19, TypeScript (strict).
- Styling: CSS Modules per component + global design tokens in `src/styles/globals.css`. No CSS framework: the reset at the top of `globals.css` (`@layer reset`, adapted from Tailwind's preflight) removes default margins, heading sizes, list bullets and control styling, and every unlayered rule overrides it. Tailwind was removed because only its reset was used.
- Fonts via `next/font/google`: **Bricolage Grotesque** (`--font-display`, page/section headings), **Geist** (`--font-body`, body copy, controls and modal headings), **Geist Mono** (`--font-code`, file names and Markdown excerpts).
- Supabase (`@supabase/ssr` + `@supabase/supabase-js`): email/password auth and the `posted_prompts` table. Settings in `.env.local` (see `.env.example`); the schema and row-level security policies are in `supabase/migrations/`. Without the env vars the site still builds and runs, signed out, with posting unavailable.
- Zod for the validation schemas shared by forms (client) and server actions.
- Node 24, pinned in `mise.toml` so every machine and CI use the same version; run commands through the mise-activated shell. `@types/node` follows the same major.
- npm (lockfile in the repo): working setup, no gain in switching. npm workspaces (`packages/*`): the root is the Next app, `packages/cli` the CLI (own `tsconfig.json`, ESM, compiled with `tsc` to `dist/`, zero runtime dependencies); the root `tsconfig.json` excludes `packages/` so the Next build ignores it, while root ESLint and Prettier cover it.
- ESLint 9 with `eslint-config-next` (flat config): keeps the Next-specific rules (core web vitals, React hooks). Stay on 9 until the bundled plugins list ESLint 10 as a peer.
- Prettier, pinned in the project (`.prettierrc.json`: `printWidth: 120`, LF), with `eslint-config-prettier` last in the ESLint config: same output in Zed, the CLI and CI. Chosen over Biome to keep the Next lint rules. `content/prompts/` is ignored because those files are the product, byte for byte. `.gitattributes` keeps LF on Windows.
- Vitest 5 for unit tests of plain TypeScript (validation rules, form classes, helpers), as `*.test.ts` next to the code, Node environment, in two projects: `site` (`src/**`, `@/` resolves through Vite's built-in `resolve.tsconfigPaths`) and `cli` (`packages/cli/src/**`, relative imports). Async Server Components need E2E tests (Playwright) instead, per the Next docs.
- TypeScript 5: stay off TypeScript 7 until it ships a JavaScript API (the `next` editor plugin needs it).
- Supabase CLI (dev dependency, config in `supabase/config.toml`): applies migrations and generates the table types.
- Full reasoning, traps and pending work for the tooling: `docs/dev-tooling.md`. Database: `docs/database.md`. Review workflow (pull-request style reviews, co-authors, invites): `docs/review-workflow.md`. Roles (visitor, signed-in user, owner, co-author, admin), what each can do and where it is enforced: `docs/roles-and-access.md`. Local Supabase: `docs/local-supabase-setup.md`.
- CI: `.github/workflows/ci.yml` runs lint, format check, tests and build (site, then the CLI's tests and build) on pushes to `main`/`dev` and on pull requests (Node from `mise.toml`, no secrets needed).

## Commands

- `npm run dev`: dev server at `http://localhost:3000`
- `npm run build`: production build (also type-checks)
- `npm run start`: serve the production build
- `npm run lint`: ESLint
- `npm run format` / `npm run format:check`: write / check Prettier formatting
- `npm test` / `npm run test:watch`: Vitest once / in watch mode (site and CLI)
- `npm run cli:build` / `npm run cli:test`: compile the CLI to `packages/cli/dist` / run only its tests; try it with `MDSTORE_API_URL=http://localhost:3000 node packages/cli/dist/cli.js search forms`
- `npm run db:push`: apply `supabase/migrations/` to the linked project (after `npx supabase login` and `npx supabase link --project-ref <ref>`)
- `npm run db:test`: run the pgTAP tests in `supabase/tests/` against the local stack
- `npm run db:types`: regenerate `src/lib/supabase/database.types.ts` from the linked project

## Structure

```text
src/
├─ app/[locale]/             routes only (en unprefixed, es under /es; see src/i18n/routing.ts)
│  ├─ layout.tsx             root layout: fonts, metadata title template, header + footer
│  ├─ page.tsx               landing page (composes the homepage sections)
│  ├─ upload/page.tsx        "Upload your prompts": hero, benefits, tips, steps, posting form
│  ├─ login/page.tsx         sign-up / sign-in tabs (LoginPanel inside <Suspense>)
│  ├─ profile/page.tsx       signed-in account: details, latest five uploads, change username /
│  │                         email / password (each session read inside <Suspense>)
│  ├─ my-prompts/page.tsx    every post the user owns or co-authors, newest first
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
│  ├─ prompts/[slug]/review/page.tsx
│  │                         a post's review, like a pull request (authors + admins only):
│  │                         conversation, file with line comments, changes between
│  │                         revisions with line comments on either side (like a PR diff),
│  │                         "push a new version" form; `?review=&tab=&revision=`
│  ├─ reviews/page.tsx       admins' review queue
│  ├─ invite/[token]/page.tsx
│  │                         co-author invite link (sign in, then confirm with a button)
│  └─ not-found.tsx          branded 404 for every unmatched URL (real 404 status)
├─ app/api/v1/prompts/       public JSON API, outside [locale]: route.ts (list), [slug]/route.ts
│                            (metadata), [slug]/file/route.ts (free .md); one handler per purpose
├─ components/
│  ├─ shared/                shared by several pages: SiteHeader, SiteFooter, SiteLogo,
│  │                         MobileMenu (the header's menu on every screen size: overflow links, plus Reviews for admins via useIsAdmin), AccountControl (sign in / profile / sign out), PrimaryButton,
│  │                         SecondaryButton, SubmitButton, FormAlert, SkeletonBlock, icons,
│  │                         EmailField, PasswordField, HelperChunks (login + profile forms),
│  │                         SubmissionList (a user's posts, for /profile and /my-prompts), RatingStars,
│  │                         navLinks, LanguageSwitcher, LanguageBanner, RouteIndex (sticky rail on
│  │                         wide screens, status bar with an Outline popover on narrow ones; driven
│  │                         by `sections` props) and RouteIndexLayout (the <main> grid that holds it)
│  ├─ homepage/              landing-only sections: Hero, FeaturedPrompts (static heading +
│  │                         PopularPrompts in <Suspense>, which loads the ranked posts and renders
│  │                         FeaturedPromptGrid: category filters + cards), PromptCard (from
│  │                         PromptCardData in src/lib/promptCard.ts),
│  │                         HowItWorks, WhyMarkdown, UploadCta, Faq; the page reads as one
│  │                         Markdown file: homeSections (the route index's order), MarkdownField
│  │                         (hero's WebGL backdrop, lazy, see src/lib/markdownFieldRenderer.ts)
│  ├─ upload/                used only by /upload: its sections, PostPromptSection (session
│  │                         check in <Suspense>), PostPromptForm, PostFormField
│  ├─ profile/               used only by /profile: ProfileSection, AccountDetails, RecentUploads,
│  │                         UsernameSlot / EmailSlot (session reads), ChangeUsernameForm,
│  │                         ChangeEmailForm, ChangePasswordForm
│  ├─ my-prompts/            used only by /my-prompts: MyPromptsList
│  ├─ login/                 LoginPanel (tabs, owns mode + submission), SignUpForm, SignInForm
│  ├─ prompt-detail/         used only by /prompts/[slug]: PromptDetail (the page body),
│  │                         InlineCode (renders `backticks` in listing copy as <code>),
│  │                         PromptDetailSkeleton (its Suspense fallback), OutputExamples
│  │                         (screenshots from `outputExamples`, placeholders while empty),
│  │                         TestedModels (the `tested_models` of a listing, from the
│  │                         `ai_models` registry in src/data/aiModels.ts), AuthorBar (links to
│  │                         the review for authors and admins), RatingSummary (stars, average,
│  │                         count), PromptRatings (session read in <Suspense>) + RatingForm
│  └─ review/                review page, queue and invite: ReviewBody, ReviewTimeline,
│                            RevisionFile, RevisionChanges, DiffTable, LineThread (a line's
│                            comments, shared by both), CommentForm, DecisionForm,
│                            AuthorsPanel, WithdrawButton, ReviewQueue, InviteBody/InviteAccept
│                            (own modules + src/styles/review.module.css and reviewPage.module.css)
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
│                            server; username.ts), forms/ (BaseForm, SignInForm/SignUpForm,
│                            UsernameForm, PromptPostForm), review/ (line diff, review types,
│                            timeline and field changes), splitFileLines.ts
├─ server/                   server-only code ("server-only" import): supabase/ clients and
│                            session refresh, auth/ (actions, getSignedInUser),
│                            profiles/ (signed-in profile, account profile, require_account_profile,
│                            actions: set_username, change_username, change_email, change_password),
│                            prompts/ (post action, cached posted-prompt reads, popular prompts, view resolver,
│                            the user's posts (mySubmissions); promptApi: the API's summaries, details, sha256, errors), ratings/ (the visitor's own rating, the rate_prompt action), reviews/ (review page data, queue, invites,
│                            actions calling the review functions with rpc)
├─ styles/globals.css        :root tokens, reset, typography, element defaults (no classes)
│  *.module.css              shared (review, form, section, modal, utilities), page-level (reviewPage)
│                            and heavy modules, imported as `@/styles/x.module.css`
└─ proxy.ts                  rewrites unknown /prompts/[slug] (not in the catalogue, not an
                             approved post, and not a pending post of the signed-in author or an
                             admin) to the 404 page for a real 404 status, runs next-intl, and
                             refreshes the Supabase session cookies on every request
content/prompts/             the full .md files of the curated catalogue (keep excerpt/lineCount
                             in src/data/prompts.ts in sync)
supabase/migrations/         SQL for the posted_prompts table, its checks and RLS policies (new
                             changes go in a new file, e.g. the version column and the agent kind)
packages/cli/                the `mdstore` CLI (npm workspace): src/cli.ts (args), api.ts, targets.ts
                             (kind × tool → path, tool detection), install.ts, lockfile.ts, paths.ts
                             (root containment), hash.ts, validation.ts, one *Command.ts per command
public/                      static files served as-is (favicon.ico, icon.svg (the logo mark), images, robots.txt);
                             never put static files in src/app/
```

- Imports use the `@/*` alias (→ `src/*`), never `../`. Every component lives in its own folder named after it (`components/homepage/Hero/Hero.tsx`) with its `*.module.css` beside it; styles live only in a component's own folder or in `src/styles/` (no feature-level `shared/` folders); `globals.css` holds no classes, so every class comes from a CSS Module.

## Conventions specific to this project

- **Colours** live only as tokens on `:root` in `globals.css` (light + `prefers-color-scheme: dark`). The brand colour is `#31606B` (deep, muted teal) and every token derives from it. Roles: `--color-background` (teal-tinted off-white / near-black teal), `--color-primary` (brand teal `#31606B`, lifted to `#7DB9C5` in dark mode: key CTAs, active states, borders, glows), `--color-primary-text` (the primary as text; equal to the primary today, since `#31606B` is AA as text, kept so a lighter brand colour can get its own text shade), `--color-secondary` (pale teal surfaces), `--color-tertiary` (burnt orange, the primary's complement, reserved for warnings/toasts), `--color-chrome` / `--color-on-chrome` / `--color-chrome-accent` (header and footer band: the brand colour in light mode, a deep teal band with a light-teal logo in dark mode), plus ink, surface, border (`--color-border-strong` outlines form controls at 3:1), code and focus tokens. Never use raw hex in components; the only hard-coded copies are in `public/icon.svg` (a favicon cannot read tokens).
- **Sizes**: font sizes use the `--text-*` clamp tokens; spacing uses the `--space-*` clamp tokens; page width uses `--content-width`. Sections are separated with `gap` on `main`, not margins.
- **Button kinds**: `PrimaryButton` (purchase CTAs: hero "Browse prompts"), `SubmitButton` (form submits, stays enabled while invalid, disabled only in flight), `SecondaryButton` (acquisition/contact: "Upload your prompt", "Sign in to post"), tertiary text buttons ("Sign out"), interface controls (header menu toggle).
- **Route index**: every multi-section route (today `/`, `/upload`, `/prompts/[slug]`, `/profile`) renders its <main> through `RouteIndexLayout`, passing `sections` (`id`, localized `label`, heading `level`) and a `file_name`. An entry is any block with that `id`, not necessarily a `<section>`; the shared UI strings are under `routeIndex` in `common.json`, each route's labels under its own `outline.sections`. Routes with a single block (login, my prompts, invite, 404) have none. The rule is also in the `navigation-ux` skill.
- **Auth**: only signed-in users can post; the server action re-checks the session (`get_signed_in_user`, verified with `getClaims()`) and RLS only accepts rows whose `author_id` is the caller. The header's `AccountControl` refreshes the page on sign-in/sign-out, so the upload form disappears when the session ends.
- **Forms** follow the global auth-form rules: validation rules live once in `src/lib/validation/` (client checks + Zod schemas for the server), form state lives in `src/lib/forms/` classes, guidance is inline under each field, and submit focuses the first wrong field. Shared field styles (`field`, `label`, `input`, `hint`, `guidance`, with `data-mark` / `data-valid`) are in `src/styles/form.module.css`; the `data-state` colours of helper chunks are element-level rules in `globals.css`.
- **Naming**: camelCase for variables, functions, props and object keys; PascalCase for components and types; UPPER_SNAKE_CASE for module constants. snake_case appears only where an outside system owns the name: Supabase column names (`PostedPromptRow`, the insert in `src/server/prompts/actions.ts`, `DETAIL_COLUMNS`), Supabase error codes and parameters (`token_hash`, `email_change`) and cookie names (`mdstore_locale`). Until `npm run db:types` is wired into the clients, the insert's column names are not type-checked, so keep them in sync with the migration by hand.
- **Modals and popovers**: there is no modal dialog right now. The route index's narrow-screen outline is a native `popover` that uses the shared `closeFloating` X from `src/styles/modal.module.css`; a new dismissible modal should be a native `<dialog>` (Escape, backdrop click, that same X).
- **Titles**: format `Page | mdstore`, defined once in `src/lib/site.ts` (`titleTemplate`) and applied in the root layout; the home page uses `title.absolute` to lead with the brand.
- **Behavioural state** uses attributes, not classes (`aria-pressed` on category filters, `data-size` on buttons, `data-token` in code previews).
- Keep this file up to date as routes (listing pages, checkout, seller dashboard, auth) and the backend are added.
