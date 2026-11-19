# Database

Status (2026-11-15): the first two migrations run on the hosted project and the local stack; the collaborative review migration runs on the local stack only (see `docs/local-supabase-setup.md`). This explains how mdstore's Supabase database is meant to work and the traps to know before changing it. The CLI and migration commands are in `docs/dev-tooling.md` (Supabase CLI).

The goal of this part of the project is also to learn raw PostgreSQL, so there is no ORM: the schema, rules and (later) queries are plain SQL in `supabase/migrations/`.

## Source of truth

- **Every schema change is a SQL file in `supabase/migrations/`**, named `<timestamp>_<what>.sql` (`npx supabase migration new <name>`). Never edit a migration that has been applied, and never change tables by clicking in the dashboard: add a new migration.
- Two independent databases can be built from those files: the **hosted** project (supabase.com, linked with `supabase link`, updated with `npm run db:push`) and an optional **local** one (`supabase start`, needs Docker, rebuilt with `supabase db reset`). They share no data, only the migrations.
- Order so far:
  1. `20261110000000_create_posted_prompts.sql`: the `posted_prompts` table, its checks, an index and RLS.
  2. `20261114000000_add_review_workflow.sql`: post statuses, `admins` and `is_admin()`.
  3. `20261116000000_add_collaborative_review.sql`: usernames, co-authors, reviews with revisions and comments, invite links (see [Collaborative review](#collaborative-review)). Applied to the local stack only so far.
  4. `20261117000000_add_version_to_posted_prompts.sql` and `20261118000000_add_agent_kind.sql`: the listing version and the `agent` kind.
  5. `20261119000000_allow_username_change.sql`: `profiles.username_changed_at` and `change_username()` (rename from `/profile`, 30-day cool-down). Tests: `supabase/tests/database/username_change.test.sql`.
  6. `20261120000000_add_line_comment_side.sql`: `review_comments.line_side` (`new` or `old`) and `add_review_comment(..., p_line_side)`, so the Changes tab can take comments on removed lines; `old` counts lines in the file the revision is compared with. Tests: `supabase/tests/database/line_comment_side.test.sql`.
- Database tests: `supabase/tests/database/*.test.sql` (pgTAP), run with `npm run db:test` against the local stack. Each file runs in a transaction that is rolled back.

## `posted_prompts`

One row per listing posted from `/upload` (a prompt or a skill). It holds the listing copy, the full `.md` in `content` (up to 200 KB) and the free-preview length.

- **The database checks the same rules as the app's frontend.** The form validates in `src/lib/validation/promptPost.ts` (slug and file-name patterns, length limits, allowed categories, array sizes). The table repeats those rules as `CHECK` constraints, because anyone with the publishable key can call the API directly and skip the form. When you change a rule, update both the validation file and the migration.
- `author_id` defaults to `auth.uid()` and cascades on user deletion. `slug` is unique.
- **Column names are snake_case** because the database owns them; the TypeScript that reads them keeps those spellings (`PostedPromptRow`, `DETAIL_COLUMNS`).

## Indexes

An index is a sorted lookup structure Postgres keeps next to a table, so it can find matching rows without reading every row. Both indexes below are created by migrations on `posted_prompts`; nothing is applied to a database yet (see the status line at the top).

| Index                                  | Columns                | Created by                             | Queries it serves                                                                                                                    |
| -------------------------------------- | ---------------------- | -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `posted_prompts_author_id_idx`         | `author_id`            | `20261110000000_create_posted_prompts` | lookups by author: the author branch of the select policy, deleting a user's rows, the "my prompts" list (`/my-prompts`, `/profile`) |
| `posted_prompts_status_created_at_idx` | `status`, `created_at` | `20261114000000_add_review_workflow`   | the public listing (`status = 'approved'`) and the review queue (`status = 'pending'`, oldest first)                                 |

**Why `(status, created_at)` is one composite index:** both queries filter `status` by equality and then sort by `created_at`, so a single index returns the rows already in order. Two separate indexes would force Postgres to combine them or sort afterwards. `status` goes first (equality filter), `created_at` second (ordering only).

**Not measured:** chosen as a cheap, sensible default, not from measurements. With few rows no index is needed yet. A partial index (e.g. `where status = 'pending'`) would be smaller. Once there is real data, check with `EXPLAIN` that Postgres uses it before changing anything.

## Review workflow

Posts are not public at once. Everything starts as `pending` and an admin decides.

| `status`   | Who can see it                       | How it gets set                        |
| ---------- | ------------------------------------ | -------------------------------------- |
| `pending`  | the author and admins                | default on insert                      |
| `approved` | everyone (appears at `/prompts/...`) | an admin updates the row               |
| `rejected` | the author and admins                | an admin updates it, ideally with note |

- Extra columns: `kind` (`prompt`, `skill` or `agent`), `review_note` (max 1000 chars, the reason for a rejection), `reviewed_at`, `reviewed_by`. A trigger (`stamp_review`) fills the last two whenever `status` changes, so nobody has to remember.
- The second migration also creates the index `posted_prompts_status_created_at_idx`, which serves the public listing and the review queue. See [Indexes](#indexes).
- The first migration's rows predate the workflow, so the second one marks them `approved`.
- Since the third migration, reviews happen in the app (`/reviews` for admins, `/prompts/[slug]/review` per post) through `decide_review()`. Direct updates of `posted_prompts` are no longer allowed from the API; the SQL editor still can, but bypasses the review history.

## Collaborative review

Modelled on pull requests. Product rules, pages and code: [`review-workflow.md`](review-workflow.md). Every write goes through a `security definer` function (called with `supabase.rpc()` from `src/server/reviews/actions.ts`) that checks the caller; the tables only have select policies.

| Table              | One row per                                         | Who can read it               |
| ------------------ | --------------------------------------------------- | ----------------------------- |
| `profiles`         | account with a `@username` (unique, ignoring case)  | everyone (bylines)            |
| `post_authors`     | author of a post: one `owner`, any `coauthor`s      | whoever can see the post      |
| `prompt_reviews`   | proposed change ("pull request"), numbered per post | the post's authors and admins |
| `prompt_revisions` | version an author pushed ("commit"), a full copy    | the post's authors and admins |
| `review_comments`  | comment, line comment or decision                   | the post's authors and admins |
| `post_invites`     | one-time co-author link (only its SHA-256 is kept)  | nobody (functions only)       |

- **Lifecycle.** Posting inserts into `posted_prompts`; a trigger (`start_post_review`) makes the poster the owner and opens review 1 with the post as revision 1. Authors `push_revision()`: it joins the review in progress (and turns "changes requested" back into "open"), or, for an approved post with none in progress, opens a new review whose `base_revision_id` is the live version. Admins `decide_review()`: `approved` copies the review's latest revision into `posted_prompts` (`live_revision_id`), `changes_requested` hands it back, `rejected` closes it (and rejects a post that was never approved; an approved post keeps its live version). The owner can `withdraw_review()`.
- **What `posted_prompts` shows.** The latest revision while a post was never approved, then the live (approved) revision. Proposed changes don't touch the public page until approved.
- **Usernames.** Sign-up sends `username` as user metadata; the `on_auth_user_created` trigger creates the profile (a taken or malformed name is skipped, and the app asks for one before posting, commenting or joining). Since `20261119000000_allow_username_change`, users rename themselves from `/profile` through `change_username()` (at most once every 30 days, tracked in `profiles.username_changed_at`); it also rewrites `posted_prompts.author_handle` on the posts they own. Old names aren't reserved. Existing authors got the handle of their latest post.
- **Co-authors.** The owner adds them with `add_post_coauthor()` (by username) or `create_post_invite()` (a link valid once for 7 days, accepted with `accept_post_invite()`); `remove_post_author()` removes a co-author or lets one leave. Co-authors push revisions and comment; only the owner manages authors or withdraws.
- **Errors.** The functions raise their own SQLSTATE codes (`MD401` not signed in, `MD403` not allowed, `MD404` not found, `MD409` closed, `MD422` invalid, `MD428` no username); the server actions map them to messages.
- **Admins may review their own posts**, since there's a single admin for now.
- **PostgREST embeds between `posted_prompts` and `prompt_reviews` need the foreign key named** (`prompt_reviews!prompt_reviews_post_id_fkey`): `prompt_revisions` and `review_comments` also link the two tables, which makes an unnamed embed ambiguous.
- **Not built yet:** notifications (authors learn about feedback by opening the review), editing or deleting comments, renaming usernames, and pagination (the review page loads every revision of a post, each up to 200 KB).

## Row-level security (RLS)

RLS is what makes it safe for the browser to talk to the database with a public key. With RLS on, a table denies everything that no policy allows.

| Operation | Policy                                                                                                                      |
| --------- | --------------------------------------------------------------------------------------------------------------------------- |
| select    | `status = 'approved'` or `auth.uid() = author_id` or `is_admin()`                                                           |
| insert    | signed in, `auth.uid() = author_id`, and `status = 'pending'` with no review fields set (authors cannot approve themselves) |
| update    | none since the collaborative review migration: changes go through `push_revision()` and `decide_review()`                   |
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
- More pgTAP coverage: `review_workflow.test.sql` covers the review functions and their policies; `posted_prompts` visibility and inserts have no tests of their own yet.
- Apply `20261116000000_add_collaborative_review.sql` to `mdstore-prod` (`npm run db:push -- --remote`) together with the app code that uses it.
- The CLI feature (separate worktree) must only download `approved` listings.
