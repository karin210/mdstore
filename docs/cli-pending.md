# CLI and prompts API: what still has to be settled

Status: written 2026-11-14, after the first phase (free prompts only). How the feature works: `docs/cli.md`. The CLI (`packages/cli`), the public API (`src/app/api/v1/prompts`) and the prompt `install_kind` / `version` fields are in place; this lists what must happen, or be decided, before the feature works well for real users. Remove items as they are done.

## Must do before deploying

1. **Apply the migration.** `supabase/migrations/20261117000000_add_install_kind_and_version_to_posted_prompts.sql` has not been run. The posted-prompt reads now select `install_kind` and `version`, so until `npm run db:push` runs on the linked project, every posted-prompt page and `GET /api/v1/prompts` answer 500 on a deployment with Supabase configured. Apply it before (or with) the deploy that ships this code, then `npm run db:types`.
2. **Deploy the API.** The CLI defaults to `https://mdstore-seven.vercel.app` (`production_url` in `packages/cli/src/config.ts`, kept equal to `siteConfig.url` in `src/lib/site.ts` by a test). Until a deployment with `/api/v1/prompts` is live there, `npx mdstore …` only works with `MDSTORE_API_URL` pointing at a local server.
3. **Check the deployed file tracing.** `next.config.ts` ships `content/prompts/` with `/api/v1/prompts/[slug]` and `/[slug]/file`. After the first deploy, check that `GET /api/v1/prompts/global/file` returns the file and that its SHA-256 matches `GET /api/v1/prompts/global`.

## Must do before publishing the CLI to npm

4. **The package name.** `mdstore` on npm must be free or owned by you; otherwise pick a scoped name (`@<scope>/mdstore`) and update the README, the `npx` line on the listing pages (`promptDetail.purchase.cliNote` in en/es) and `CLAUDE.md`.
5. **License and metadata.** `packages/cli/package.json` says `"license": "UNLICENSED"` and has no `repository`, `homepage` or `keywords`. Choose a license and fill them in.
6. **Publishing flow.** Decide who publishes and how (by hand, or a CI job on a tag), and add a `prepublishOnly` script that builds and tests. Keep the CLI version (`packages/cli/package.json`) independent of the site's.

## Keep in mind while the catalogue changes

7. **Versions are bumped by hand.** Each catalogue listing's `version` in `src/data/prompts.ts` must go up by one in the same commit that changes its file in `content/prompts/`. Nothing checks it: a forgotten bump means `mdstore outdated` and `update` never offer the new file. Posted prompts can't be edited yet, so theirs stay at 1.
8. **Choose each listing's `install_kind` with care.** It decides where the CLI writes the file (`instructions`, `command` or `agent`). Today every catalogue file is `instructions` except `dev-tools-advisor` (`agent`). Changing a kind later only warns on `update`; users have to run `add` again to move the file.
9. **The kind list lives in three places:** `install_kinds` in `src/data/prompts.ts`, the `posted_prompts` check in the migration, and `packages/cli/src/kinds.ts`. A test (`packages/cli/src/kinds.test.ts`) fails when they drift; a new kind needs a new migration and a CLI release, and older CLIs refuse prompts of a kind they don't know.

## Open decisions

10. **`update` exit code.** It exits 1 when it skips a prompt the user edited (or that was removed or became paid). Decide whether a skip should only warn.
11. **Paging the list.** `GET /api/v1/prompts` returns every catalogue listing plus the newest 500 posts, filtered in memory. Add paging (and a database-side search) before posts grow past that.
12. **Tools that don't follow references.** For shared files (`CLAUDE.md`, `AGENTS.md`, `.github/copilot-instructions.md`, `CONVENTIONS.md`) the CLI writes `.mdstore/<slug>.md` and adds a reference line. Claude Code loads the `@` import; Aider and Copilot don't open referenced files on their own (the README tells Aider users to use `--read`). Decide whether those tools should get the content inlined between markers instead.
13. **Cursor rule frontmatter.** `.mdc` rules get `alwaysApply: true` for instructions and `false` for agents. Check with real Cursor projects that this is the behaviour authors want, or let a listing set it.
14. **Rate limiting and caching.** The API is public and unauthenticated. Consider a rate limit (or the Vercel Firewall) and `Cache-Control` headers on the metadata and file routes.

## Later phases (out of scope so far)

15. **Paid prompts:** checkout, an account token for the CLI (`mdstore login`), and an authorized file route. Paid content must still never reach a response without a verified purchase.
16. **Uninstall:** `mdstore remove <slug>`, deleting the file and its reference line and the lockfile entry.
17. **Editing posts:** when authors can upload a new file, bump the post's `version` on the server in the same write.
18. **End-to-end tests:** a Playwright or script-based check that runs the built CLI against `next start` (search, add, list, outdated, the 403 on a paid listing), as done by hand for this phase.
