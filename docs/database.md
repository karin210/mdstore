# Database

Status: schema written 2026-11-14, **not applied to any database yet** (no hosted project is linked, and there is no `.env.local`). This explains how mdstore's Supabase database is meant to work and the traps to know before changing it. The CLI and migration commands are in `docs/dev-tooling.md` (Supabase CLI).

The goal of this part of the project is also to learn raw PostgreSQL, so there is no ORM: the schema, rules and (later) queries are plain SQL in `supabase/migrations/`.

## Source of truth

- **Every schema change is a SQL file in `supabase/migrations/`**, named `<timestamp>_<what>.sql` (`npx supabase migration new <name>`). Never edit a migration that has been applied, and never change tables by clicking in the dashboard: add a new migration.
- Two independent databases can be built from those files: the **hosted** project (supabase.com, linked with `supabase link`, updated with `npm run db:push`) and an optional **local** one (`supabase start`, needs Docker, rebuilt with `supabase db reset`). They share no data, only the migrations.
- Order so far:
  1. `20261110000000_create_posted_prompts.sql`: the `posted_prompts` table, its checks, an index and RLS.
  2. `20261114000000_add_review_workflow.sql`: the review workflow below.

## `posted_prompts`

One row per listing posted from `/upload` (a prompt or a skill). It holds the listing copy, the full `.md` in `content` (up to 200 KB) and the free-preview length.

- **The database checks the same rules as the app's frontend.** The form validates in `src/lib/validation/promptPost.ts` (slug and file-name patterns, length limits, allowed categories, array sizes). The table repeats those rules as `CHECK` constraints, because anyone with the publishable key can call the API directly and skip the form. When you change a rule, update both the validation file and the migration.
- `author_id` defaults to `auth.uid()` and cascades on user deletion. `slug` is unique.
- **Column names are snake_case** because the database owns them; the TypeScript that reads them keeps those spellings (`PostedPromptRow`, `DETAIL_COLUMNS`).

## Indexes

An index is a sorted lookup structure Postgres keeps next to a table, so it can find matching rows without reading every row. Both indexes below are created by migrations on `posted_prompts`; nothing is applied to a database yet (see the status line at the top).

| Index                                  | Columns                | Created by                             | Queries it serves                                                                                                    |
| -------------------------------------- | ---------------------- | -------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `posted_prompts_author_id_idx`         | `author_id`            | `20261110000000_create_posted_prompts` | lookups by author: the author branch of the select policy, deleting a user's rows, the planned "my submissions" view |
| `posted_prompts_status_created_at_idx` | `status`, `created_at` | `20261114000000_add_review_workflow`   | the public listing (`status = 'approved'`) and the review queue (`status = 'pending'`, oldest first)                 |

**Why `(status, created_at)` is one composite index:** both queries filter `status` by equality and then sort by `created_at`, so a single index returns the rows already in order. Two separate indexes would force Postgres to combine them or sort afterwards. `status` goes first (equality filter), `created_at` second (ordering only).

**Not measured:** chosen as a cheap, sensible default, not from measurements. With few rows no index is needed yet. A partial index (e.g. `where status = 'pending'`) would be smaller. Once there is real data, check with `EXPLAIN` that Postgres uses it before changing anything.

## Review workflow

Posts are not public at once. Everything starts as `pending` and an admin decides.

| `status`   | Who can see it                       | How it gets set                        |
| ---------- | ------------------------------------ | -------------------------------------- |
| `pending`  | the author and admins                | default on insert                      |
| `approved` | everyone (appears at `/prompts/...`) | an admin updates the row               |
| `rejected` | the author and admins                | an admin updates it, ideally with note |

- Extra columns: `kind` (`prompt` or `skill`), `review_note` (max 1000 chars, the reason for a rejection), `reviewed_at`, `reviewed_by`. A trigger (`stamp_review`) fills the last two whenever `status` changes, so nobody has to remember.
- The second migration also creates the index `posted_prompts_status_created_at_idx`, which serves the public listing and the review queue. See [Indexes](#indexes).
- The first migration's rows predate the workflow, so the second one marks them `approved`.
- Reviewing is done by hand in the dashboard's SQL editor until there is an admin page:

  ```sql
  select slug, title, created_at from posted_prompts where status = 'pending' order by created_at;
  update posted_prompts set status = 'approved' where slug = '...';
  update posted_prompts set status = 'rejected', review_note = '...' where slug = '...';
  ```

## Row-level security (RLS)

RLS is what makes it safe for the browser to talk to the database with a public key. With RLS on, a table denies everything that no policy allows.

| Operation | Policy                                                                                                                      |
| --------- | --------------------------------------------------------------------------------------------------------------------------- |
| select    | `status = 'approved'` or `auth.uid() = author_id` or `is_admin()`                                                           |
| insert    | signed in, `auth.uid() = author_id`, and `status = 'pending'` with no review fields set (authors cannot approve themselves) |
| update    | `is_admin()` only (authors cannot edit yet)                                                                                 |
| delete    | none, so denied                                                                                                             |

Traps:

- Writing `auth.uid()` as `(select auth.uid())` inside policies lets Postgres evaluate it once per query instead of once per row.
- **Pending and rejected slugs return no row for anonymous readers**, so `/prompts/[slug]` 404s for them unless the reader is the author or an admin. Two layers apply this:
  - The cached reads in `src/server/prompts/postedPrompts.ts` use the anonymous client, so they only ever see approved rows.
  - For a slug nobody can see publicly, the proxy asks `postedPromptVisibleToRequest` (a client built from the request's cookies, skipped when there is no Supabase cookie), and the page body falls back to `getPostedPromptForViewer` (uncached, the visitor's session). RLS decides: authors and admins get the page with a "waiting for review" notice, everyone else gets the same 404 as an unknown slug.
  - `generateMetadata` reads only public prompts, so it never touches the session; a post in review gets a generic `noindex` title.
  - `/prompts/[slug]/download` still uses the public read only, so pending files are not downloadable (not even by their author or an admin).
  - If the proxy's lookup fails (for example an expired session token, since the proxy checks before it refreshes the session), it lets the request through and the page decides, so such a visitor may see the 404 page with a 200 status instead of a real 404.
- Anything cached with `cacheTag` must never hold a pending row, or it leaks to everyone.

## Admins

- `public.admins (user_id)` lists who may review. RLS is on with **no policies**, so the API can neither read nor write it; only the SQL editor and security-definer functions can.
- `public.is_admin()` is `security definer` (runs with its owner's rights, so it can read the locked table) with `search_path = ''` (so a caller cannot shadow tables with their own schema). Use it in policies; never expose the table.
- Add yourself once, after signing up, from the SQL editor:

  ```sql
  insert into public.admins (user_id) select id from auth.users where email = '<your email>';
  ```

## Pending work

- Wire `npm run db:types` output into the Supabase clients so queries are type-checked.
- Decide how app queries are written: Postgres functions called with `supabase.rpc()`, or a direct driver (`postgres` / `pg`) with hand-written SQL. A direct driver bypasses RLS, so authorization would move into the queries.
- RLS tests with pgTAP (`supabase test db`, needs the local stack) before real users post.
- The CLI feature (separate worktree) must only download `approved` listings.
