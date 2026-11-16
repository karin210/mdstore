# CLI and prompts API

Status: first phase in place since 2026-11-14 (free prompts only). This explains how the feature works end to end, why it is built this way, and how to change it safely. What is still missing, or still to be decided, is in `docs/cli-pending.md`. The user-facing guide (commands, install targets, lockfile) is `packages/cli/README.md`.

## What it does

Developers install mdstore skills and agents into their project from the terminal, the way skills.sh installs skills. Prompts are not installed by the CLI: they are copied or downloaded from the listing page.

```sh
npx mdstore search forms
npx mdstore add <skill-or-agent-name>
npx mdstore outdated
npx mdstore update
```

The CLI downloads a listing's `.md` from the site, verifies it, writes it where the developer's AI tool reads it, and records it in a lockfile so it can later tell when a newer version is out. Paid prompts are refused for now: they need checkout and a CLI login first.

## How the pieces fit

```text
 site (this repo, Next.js)                                     developer's project
 ─────────────────────────                                     ───────────────────
 src/data/prompts.ts ─┐                                        .claude/skills/<slug>/SKILL.md  ← skills
   (kind, version)    │                                        .claude/agents/<slug>.md        ← agents
 content/prompts/*.md ├─► src/server/prompts/promptApi.ts      mdstore.lock.json              ← what was installed
 posted_prompts (DB) ─┘        │
   (kind, version)             ▼
                       src/app/api/v1/prompts/  ──HTTP JSON──►  packages/cli (npx mdstore)
```

Four parts, each in its own place:

1. **Data.** Every listing has a `kind` and a `version`, in the catalogue (`src/data/prompts.ts`) and in the `posted_prompts` table.
2. **Public API.** Three read-only route handlers under `src/app/api/v1/prompts/` serve listings, metadata and free files. The shared mapping lives in `src/server/prompts/promptApi.ts`.
3. **CLI.** The `mdstore` package in `packages/cli`, an npm workspace of this repo.
4. **Site.** Free skill and agent listing pages show `npx mdstore add <slug>` under the purchase card; prompt pages show only the download.

## 1. Data: kind and version

| Field     | Values                                | Where it is set                                                                     | What it is for                                   |
| --------- | ------------------------------------- | ----------------------------------------------------------------------------------- | ------------------------------------------------ |
| `kind`    | `prompt`, `skill`, `agent`            | Catalogue: `prompts.ts`. Posts: the "Type" upload field (a revision can change it). | Decides how a developer gets the file.           |
| `version` | Integer from 1                        | Catalogue: by hand in `prompts.ts`. Posts: always 1 for now.                        | Lets `outdated` and `update` spot newer files.   |
| `sha256`  | Hex SHA-256 of the file's UTF-8 bytes | Computed by the API on each request, never stored.                                  | Lets the CLI verify a download and detect edits. |

- **prompt:** text a developer copies or downloads and uses in a session (every catalogue file today, including `global.md` and `dev-tools-advisor.md`). The CLI doesn't install it.
- **skill:** a file the agent loads on its own when a task matches it; the CLI writes it to the agent's skills folder. A skill is one `SKILL.md` for now; one that carries more files (a folder) is not supported yet (see `docs/cli-pending.md`).
- **agent:** a subagent definition: a separate worker with its own context, handed tasks by the main agent; the CLI writes it to the agent's agents folder.

The `kind` describes the listing, not the file: product files in `content/prompts/` stay byte for byte and agnostic of the tool. The CLI does the mapping to each tool's folders, and today every tool except Aider has a known skills folder (the matrix in the root `cli.md`), while only Claude Code has a known agents folder.

Posted prompts got `version` through `supabase/migrations/20261117000000_add_version_to_posted_prompts.sql` (existing rows default to 1), and the `agent` kind through `20261118000000_add_agent_kind.sql`, which widens the `kind` checks on `posted_prompts` and `prompt_revisions`.

## 2. Public API

Read-only, unauthenticated, always in English (the default locale). `src/proxy.ts` skips `/api`, so neither the locale redirect nor the session refresh runs on it. Following `content/prompts/api-route-handlers.md`, each purpose has its own handler with a header comment, and the shared logic stays in `promptApi.ts`.

| Route                              | Returns                                                                                                             |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `GET /api/v1/prompts?q=&category=` | `{ prompts: PromptSummary[] }`: catalogue listings, then posted prompts (newest 500), filtered. 400 on a bad query. |
| `GET /api/v1/prompts/[slug]`       | `PromptDetails`: the summary plus `sha256` (`null` for paid), `worksWith`, `lineCount`, `context_tokens`. 404.      |
| `GET /api/v1/prompts/[slug]/file`  | The raw `.md` as `text/markdown; charset=utf-8`. 403 for paid prompts, 404 when unknown.                            |

A summary is `slug, title, tagline, category, kind, version, priceUsd, fileName, author`, with the same field names as `PromptListing`. Every error is JSON `{ status, message }`, plus `requestId` on a 500 (logged with `logServerError`).

**Paid content never leaves the server.** The paid file is never read: `getPromptView` returns `fullMarkdown: null` for it, so there is nothing to hash or send.

`next.config.ts` traces `content/prompts/` into both `[slug]` handlers (`outputFileTracingIncludes`), otherwise the deployed functions couldn't read the catalogue files.

## 3. The CLI

`packages/cli`: ESM, compiled with `tsc` to `dist/`, Node 24, zero runtime dependencies (`node:util` `parseArgs`, global `fetch`, `node:crypto`). It talks to `MDSTORE_API_URL` when set, otherwise to `production_url` in `packages/cli/src/config.ts`. That value must equal `siteConfig.url` in `src/lib/site.ts`; a test fails when they differ.

### Modules

| File            | Job                                                                                       |
| --------------- | ----------------------------------------------------------------------------------------- |
| `cli.ts`        | Parses arguments and runs a command; turns known errors into one line and exit code 1.    |
| `api.ts`        | HTTP client for the three routes; maps 403, 404 and network failures to clear errors.     |
| `validation.ts` | Checks every API response and slug/file name against the same patterns the site enforces. |
| `kinds.ts`      | The kind and tool lists (the CLI's copy of `prompt_kinds`).                               |
| `targets.ts`    | The (kind × tool) → path table, tool detection.                                           |
| `install.ts`    | Writes the file, asking before replacing anything that differs.                           |
| `paths.ts`      | Keeps every path inside the project root, links included.                                 |
| `hash.ts`       | SHA-256 of downloads and files on disk.                                                   |
| `lockfile.ts`   | Reads and writes `mdstore.lock.json`.                                                     |
| `*Command.ts`   | One file per command: `add`, `search`, `list`, `outdated`, `update`.                      |

### What `add` does

1. Validates the slug, then fetches `GET /api/v1/prompts/<slug>`. A paid listing stops here with a link to its page, and so does a `prompt` (it says to copy or download it).
2. Picks the tool: `--tool`, or the first marker found at the project root (`.claude/` or `CLAUDE.md`, `.cursor/`, `.github/copilot-instructions.md`, `CONVENTIONS.md` or `.aider*`, `AGENTS.md`), else `agents`.
3. Looks up the target for (kind, tool) in `targets.ts`. A tool with no known folder for the kind stops with a hint to use another `--tool` or `--path`. `--path` overrides the target.
4. Downloads `/file` and compares its SHA-256 with the metadata's. Nothing is written on a mismatch.
5. Writes the file byte for byte to its own path (`.claude/skills/<slug>/SKILL.md`, `.claude/agents/<slug>.md`). The CLI owns it, so nothing of the developer's is touched.
6. Records the install in `mdstore.lock.json`: version, the hash of the file as written, path, kind and tool.

### What `outdated` and `update` do

Both read the lockfile and ask the API for each prompt's current version. `update` re-downloads the ones with a higher version into the same path, with the same tool and reference. It skips, with a warning and exit code 1:

- a file whose hash no longer matches the lockfile, because the developer edited it (`--yes` replaces the edits);
- a prompt that was removed from mdstore or became paid.

A listing whose `kind` changed is updated in place with a warning; `add` again moves it.

## Why it is built this way

- **One repo.** The API and the CLI change together, and they must agree on slugs, file names and kinds. As a workspace, one commit changes both, CI tests both, and tests catch drift between them.
- **Zero runtime dependencies.** `npx` downloads the CLI on every first run, and each dependency is something to audit. Node 24 already has everything needed.
- **The hash is computed, not stored.** It can never drift from the file it describes. The cost is one hash per request, negligible for files of a few kilobytes.
- **Versions are integers, bumped by hand.** Simple to read in the lockfile and in `outdated`. A content hash would bump automatically, but it would also call a whitespace fix a new version; that trade-off can be revisited (see `docs/cli-pending.md`).
- **English-only API.** The CLI's output is English, and one locale means one answer per URL. There are no `Cache-Control` headers yet (see `docs/cli-pending.md`).

## Common changes

### Changing a catalogue file

Edit the file in `content/prompts/`, then in the same commit raise that listing's `version` by one in `src/data/prompts.ts` (and update `lineCount`, `context_tokens` and `excerpt` as usual). Nothing checks the bump: forgetting it means installed copies never see the change.

### Adding a kind

The list lives in three places (the check is in two tables), and `packages/cli/src/kinds.test.ts` fails when they differ:

1. `prompt_kinds` in `src/data/prompts.ts`, plus its label in `src/i18n/locales/{en,es}/upload.json`.
2. A new migration changing the `kind` checks of `posted_prompts` and `prompt_revisions` (never edit an applied one; see `20261118000000_add_agent_kind.sql`).
3. `kinds` in `packages/cli/src/kinds.ts`, plus its row in `install_targets` (`targets.ts`) and the README table.

Older CLIs refuse prompts of a kind they don't know, so release the CLI before listing prompts of the new kind.

### Adding a tool

Add it to `tools` in `kinds.ts`, give it targets in `install_targets`, add its marker to `tool_markers` (`targets.ts`), cover both in `targets.test.ts`, and add its column to the README table.

### Changing the production URL

Change `siteConfig.url` in `src/lib/site.ts` and `production_url` in `packages/cli/src/config.ts` together (a test enforces it), then release the CLI. Released versions keep calling the old URL, so keep it working or redirecting.

## Trying it locally

```sh
npm run build && npm run start          # the site, with the API, on http://localhost:3000
npm run cli:build                       # compile the CLI to packages/cli/dist
cd <some test folder outside the repo>
MDSTORE_API_URL=http://localhost:3000 node <repo>/packages/cli/dist/cli.js search modal
MDSTORE_API_URL=http://localhost:3000 node <repo>/packages/cli/dist/cli.js add global --tool claude --yes
```

On Windows PowerShell, set the variable first with `$env:MDSTORE_API_URL = "http://localhost:3000"`. Without Supabase env vars the site runs with the catalogue only, so posted prompts don't appear.

Tests: `npm run cli:test` runs the CLI's unit tests (targets, tool detection, lockfile, path safety, hashes, install), `npm test` runs them with the site's. CI also builds the CLI and smoke-runs `--version`. There is no automated end-to-end test yet.
