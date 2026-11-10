# Dev tooling

Status: in place since 2026-11-10. This explains how mdstore's tooling is set up, why each piece was chosen, and the traps to know before changing it. The short version of each decision is in `CLAUDE.md` (Stack).

## Daily workflow

Run everything through the mise-activated shell (or `mise exec -- <command>`) so the pinned Node version is used.

| Command                                | What it does                                              |
| -------------------------------------- | --------------------------------------------------------- |
| `npm run dev`                          | Dev server at `http://localhost:3000`                     |
| `npm run lint`                         | ESLint with the Next.js rules                             |
| `npm run format` / `format:check`      | Prettier: rewrite files / only report what is unformatted |
| `npm test` / `npm run test:watch`      | Vitest once / in watch mode                               |
| `npm run build`                        | Production build, which also type-checks                  |
| `npm run db:push` / `npm run db:types` | Apply Supabase migrations / regenerate the table types    |

Before pushing, run what CI runs: `npm run lint; npm run format:check; npm test; npm run build`.

## The pieces and why

### Node 24, pinned in `mise.toml`

Before this change the project ran on whatever Node the global mise config had. Pinning it in the repo makes every machine and CI use the same major version. `@types/node` follows the same major (24); bump both together.

### Prettier, not Biome

Zed already formatted the code with its bundled Prettier, but with no project config, so nothing guaranteed the same output elsewhere. Prettier is now a dev dependency with its config in the repo, and Zed picks up the project-local copy automatically.

Biome was considered: faster, and it would replace both ESLint and Prettier. It was rejected because it would drop `eslint-config-next`'s Next-specific rules (core web vitals, React hooks), which caught real bugs during the login and upload work. At this project's size Prettier's speed is not a problem.

- `.prettierrc.json`: `printWidth: 120` (the width the code was already written at) and `endOfLine: "lf"`. Everything else is Prettier's default (double quotes, semicolons, trailing commas).
- `eslint.config.mjs` ends with `eslint-config-prettier/flat`, which turns off the ESLint rules that would fight Prettier. It must stay **last**.
- `.prettierignore` skips:
  - `content/prompts/`: **these files are the product.** Their bytes, line count (`lineCount`) and opening lines (`excerpt` in `src/data/prompts.ts`) must match what buyers get, so a formatter must never touch them.
  - `AGENTS.md`: `next dev` rewrites it in its own format.
  - `supabase/`: the CLI's config and the SQL migrations keep their own formatting.
  - `.next`, `next-env.d.ts` and the generated `database.types.ts`.

### LF line endings everywhere (`.gitattributes`)

Git on Windows (`core.autocrlf=true`) checks files out with CRLF, and Prettier's `endOfLine: "lf"` would then flag every file. `* text=auto eol=lf` makes Git check out LF on every OS. Files already checked out keep their old endings until they are rewritten (Prettier's first run did that for the formatted files).

### ESLint stays on version 9

`eslint-config-next` 16.4 supports ESLint 10, but the Next docs warn that some bundled plugins don't list ESLint 10 as a peer yet, so npm shows peer warnings. Upgrade once those plugins catch up.

`npm audit` reports moderate warnings for an old `minimatch` pulled in by the ESLint plugins. It only affects dev tooling, not the site, and goes away when the plugins update.

### TypeScript stays on 5

TypeScript 7 is out, and `next build` can type-check with it through the `tsc` CLI. But TypeScript 7 has no JavaScript API yet, so the `next` plugin in `tsconfig.json` (route-aware editor hints) can't load. Revisit when that API ships.

### Vitest for unit tests

The riskiest logic is plain TypeScript: the validation rules shared by the client and the server, the form classes and small helpers. Vitest is the runner the Next docs document, and it is fast and needs one config file.

- Tests are `src/**/*.test.ts`, next to the file they test.
- They run in the Node environment. To test a component, add `// @vitest-environment jsdom` at the top of that file and install `jsdom` and `@testing-library/react`.
- `@/` imports resolve through Vite 8's built-in `resolve.tsconfigPaths` (in `vitest.config.mts`), so the `vite-tsconfig-paths` plugin from the Next guide is not needed.
- **Async Server Components can't be unit tested** with Vitest (the Next docs say so). Cover them, and full flows like sign-up → post → download, with end-to-end tests (Playwright) when they are added.

What the first tests lock in:

- **Passwords:** real Chrome and Safari suggestions are accepted, a symbol is never required, the helper chunks are all met exactly when the password is valid, and generated suggestions pass the rule.
- **Emails:** the helper chunks agree with validity, and the server schema lowercases and trims the email and rejects unknown fields (such as `role`).
- **Redirects:** `//host`, `/\host`, full URLs and non-strings fall back to the default page (no open redirects).
- **Slugs:** accents dropped, kebab-case, no trailing dash after truncation.

Add a test whenever a validation rule changes: the client and the server must keep accepting exactly the same values.

### Supabase CLI

The CLI is a dev dependency (run as `npx supabase …` or through the npm scripts) with its config in `supabase/config.toml`.

- **One-time setup:** `npx supabase login`, then `npx supabase link --project-ref <ref>` (the ref is in the project's dashboard URL).
- `npm run db:push` applies the files in `supabase/migrations/` to the linked project, instead of pasting SQL into the dashboard. New schema changes go in a new migration file (`npx supabase migration new <name>`), never by editing an applied one.
- `npm run db:types` writes `src/lib/supabase/database.types.ts`. **Not done yet:** passing those types to the Supabase clients (`createServerClient<Database>`) so queries on `posted_prompts` are type-checked.
- `config.toml` only affects the **local** Supabase stack (`npx supabase start`, needs Docker). Its auth redirects allow `http://localhost:3000/auth/confirm` and `/es/auth/confirm`. The hosted project's Site URL and redirect URLs are still set in the dashboard.

### CI (`.github/workflows/ci.yml`)

Runs on pushes to `main` and `dev` and on pull requests: `npm ci`, lint, format check, tests and build, with Node from `mise.toml` (via `jdx/mise-action`). It needs no secrets because the site builds without Supabase settings. If that ever changes, add the public Supabase variables as repository secrets.

The deploy target is not decided yet. If it builds every push itself (Vercel does), the CI build step can be dropped to save time.

## Pending

- Connect the Supabase CLI to the hosted project, run `db:push`, and wire the generated types into the clients.
- End-to-end tests (Playwright) for sign-up, posting a prompt and downloading a free one.
- Upgrade ESLint to 10 and TypeScript to 7 once the blockers above are gone.
