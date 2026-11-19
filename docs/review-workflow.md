# Review workflow (pull-request style)

Status (2026-11-15): built and tested on the local stack. The migration `20261116000000_add_collaborative_review.sql` is **not applied to `mdstore-prod` yet**; push it together with the app code that uses it (`npm run db:push -- --remote`).

Posted prompts go through a review that works like a pull request: authors push versions ("revisions"), authors and admins discuss them in a thread and on single lines of the file, and an admin decides. Nothing reaches the public page until an admin approves it. The tables, functions and policies behind it are in [`database.md`](database.md#collaborative-review); this file covers the product rules, the pages and the code.

## Product rules

These were decided with the project owner before building:

| Topic                     | Decision                                                                                                                                     |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Feedback                  | A conversation thread plus comments on single lines of a revision's file.                                                                    |
| Outcomes                  | **Approve**, **Request changes** or **Reject**. A message is required unless approving.                                                      |
| Updates to approved posts | Authors propose a new revision in a new review; the live version stays public until that review is approved.                                 |
| Visibility                | A review is visible to the post's authors and the admins only. Everyone else gets a 404.                                                     |
| Several authors           | One **owner** (who posted it) and any number of **co-authors**.                                                                              |
| Adding co-authors         | By `@username`, or with a one-time invite link.                                                                                              |
| Roles                     | Co-authors push revisions and comment. Only the owner adds or removes co-authors and withdraws a review. A co-author can leave.              |
| Byline                    | The owner's `@username` first, then the co-authors (`@owner, @coauthor`).                                                                    |
| Usernames                 | Chosen at sign-up; accounts without one are asked for it before posting, commenting or joining. Renamed from `/profile`, once every 30 days. |
| Self-review               | Allowed: there is a single admin for now.                                                                                                    |

## Lifecycle

```text
post from /upload ──► review #1 open, revision 1
                          │
      authors push ──────►│◄────── comments, line comments (authors + admins)
                          │
   admin decides ─────────┼── changes requested ──► authors push again (review reopens)
                          ├── approved ──► revision copied to the public post (live)
                          ├── rejected ──► closed (a never-approved post becomes rejected)
   owner withdraws ───────┴── withdrawn ──► closed

approved post + author pushes ──► review #2 opens, compared against the live revision
```

- **One review in progress per post** (status `open` or `changes_requested`). Pushing to a post joins that review; when there is none, it opens the next one.
- **Revision numbers** run per post across all its reviews (revision 3 may be the first of review 2).
- **What the public sees:** a post that was never approved isn't public. Once approved, the public page shows the approved (live) revision, and later proposals don't touch it until they are approved. An approved post whose later review is rejected keeps its live version.
- **Pushing without a new file** keeps the latest revision's file and only changes the listing copy.
- **Each push can carry a note** (up to 1000 characters), shown in the timeline like a commit message.

## Pages

| URL                      | Who                  | What                                                                                                                                                                   |
| ------------------------ | -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/upload`                | signed in            | Posting form (now shows "Posting as @username"); "Your submissions" lists posts you own or co-author, your role, and a link to each review.                            |
| `/prompts/[slug]/review` | authors, admins      | The review. Query: `review` (number, default the latest), `tab` (`conversation`, `file`, `changes`, `revise`), `revision` (number, default the latest of that review). |
| `/reviews`               | admins               | Queue of reviews in progress: open ones first, then those waiting on their authors. Labels first posts and updates to live posts.                                      |
| `/invite/[token]`        | anyone with the link | Signed out: link to sign in (returns here). No username: pick one. Valid link: "Join as co-author" button. Used, expired or unknown links say so.                      |
| `/prompts/[slug]`        | everyone             | For authors and admins of a live post, an `AuthorBar` links to its review; a post in review shows a notice with "Open the review".                                     |

### The review page

- **Conversation:** the timeline of revisions (with their notes), comments, line comments (quoting the line, with a link to it in the file tab) and decisions, oldest first. At the bottom, a comment form for authors and admins, and for admins the decision form (three radios + message).
- **File:** the selected revision's file with line numbers. Clicking a number opens a comment form under that line; existing line comments sit under their lines.
- **Changes:** what changed in the listing fields (before/after) and a line diff of the file, with 3 unchanged lines of context around each change and collapsed runs in between. Revision 1 of a review is compared with the live version it started from; later ones with the previous revision; the first revision of a new post has nothing to compare.
- **Push a new version** (authors, while the review is in progress or the post is live): the posting form prefilled with the latest revision, the file optional, plus the note.
- **Sidebar:** history of the post's reviews, the authors panel (add by username, create and copy an invite link, remove or leave with a two-step confirm) and, for the owner, a two-step withdraw button. No browser dialogs are used.
- Closed reviews are read-only.

## Access control

Three layers, each enough on its own to stop a write:

1. **Database:** every write is a `security definer` function that checks the caller (author, owner or admin) and the review's state; the tables only have select policies, and RLS hides reviews, revisions and comments from everyone but the post's authors and the admins. `post_invites` has no policies at all and stores only the SHA-256 of each token.
2. **Server actions** (`src/server/reviews/actions.ts`) call those functions as the signed-in visitor and map their error codes to messages.
3. **Proxy** (`src/proxy.ts`): `/prompts/[slug]/review` and `/reviews` answer a real 404 (before rendering) to visitors who can't see them, through `postReviewVisibleToRequest` and `isAdminRequest` in `src/server/prompts/postedPromptExists.ts`. Like the other proxy checks, a failed lookup lets the request through and the page decides.

Invite links: opening one never joins anyone (link previews and prefetches open URLs too); joining needs the explicit button. A link works once and expires after 7 days.

## Errors

The database functions raise their own SQLSTATE codes; `ERROR_KEYS_BY_CODE` in `src/server/reviews/actions.ts` maps them to the `review.errors.*` messages:

| Code             | Key                | Meaning                                                                    |
| ---------------- | ------------------ | -------------------------------------------------------------------------- |
| `MD401`, `42501` | `unauthenticated`  | Not signed in.                                                             |
| `MD403`          | `forbidden`        | Signed in, but not allowed (not an author, not the owner, not an admin).   |
| `MD404`          | `notFound`         | The post, review, revision or user doesn't exist.                          |
| `MD409`          | `closed`           | The review is closed, or the post can't take that action now.              |
| `MD422`          | `invalid`          | Bad input that slipped past the form (missing message, line out of range). |
| `MD428`          | `usernameRequired` | The caller has no username yet.                                            |
| other            | `server`           | Logged on the server with a request id shown to the user.                  |

## Code map

| Where                                                                    | What                                                                                  |
| ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------- |
| `supabase/migrations/20261116000000_add_collaborative_review.sql`        | Tables, triggers, functions, policies and backfill of existing posts.                 |
| `supabase/tests/database/review_workflow.test.sql`                       | pgTAP tests of the functions and policies (`npm run db:test`).                        |
| `src/app/[locale]/prompts/[slug]/review/`, `reviews/`, `invite/[token]/` | Routes: thin shells that render their body inside `<Suspense>`.                       |
| `src/components/review/`                                                 | Page bodies and forms; one `Review.module.css`; `reviewHref.ts` builds review links.  |
| `src/components/prompt-detail/AuthorBar.tsx`                             | Link to the review on a live post's page.                                             |
| `src/components/shared/UsernameField.tsx`, `PickUsernameForm.tsx`        | Username input (sign-up, pick-a-username prompt).                                     |
| `src/lib/review/diffLines.ts`                                            | Line diff (Myers, no dependency) and hunks with context.                              |
| `src/lib/review/reviewView.ts`, `types.ts`                               | Revisions of a review, the base to compare with, the timeline, listing field changes. |
| `src/lib/validation/username.ts`, `promptPost.ts`                        | Username rules; the revision schema (optional file, note).                            |
| `src/server/reviews/`                                                    | `reviewData.ts` (page data and access), `reviewQueue.ts`, `invites.ts`, `actions.ts`. |
| `src/server/profiles/`                                                   | Signed-in profile and the `set_username` action.                                      |
| `src/i18n/locales/*/review.json`                                         | Copy of the review pages (also `auth.json`, `upload.json`, `promptDetail.json`).      |

## Implementation notes and traps

- **Name the foreign key in PostgREST embeds** between `posted_prompts` and `prompt_reviews` (`prompt_reviews!prompt_reviews_post_id_fkey`); otherwise the embed is ambiguous. See `database.md`.
- **The review and invite routes set `export const instant = false`.** Their params aren't known at build time and the shared header reads the URL (language switcher), so the build can't prerender a shell for them. They render per request anyway.
- **Public caches are refreshed with `updateTag`** after an approval, a rejection, a withdrawal or a change of authors (the byline changes), so the public page and listings never wait for expiry.
- **Large diffs:** past 4000 edits the diff stops searching for the best alignment and shows the changed middle as all removed, then all added. The unchanged start and end are still matched.
- **Dates on the review pages are shown in UTC** so the server render and the browser agree.
- **Existing data:** the migration gave every existing author a username (from their latest post's handle, or `user-xxxxxxxx`), made them owner of their posts, and created review 1 with revision 1 for each post, with a decision comment for posts already approved or rejected.

## Testing

- `npm run db:test`: 40 pgTAP tests (needs the local stack running).
- `npm test`: unit tests for usernames, the diff and the timeline/field changes, among others.
- Manual or scripted end-to-end run on the local stack: sign up three accounts (owner, co-author, admin; make the admin one with the SQL in `database.md`), post, open the review as each one and as a signed-out visitor, add the co-author, push revision 2, comment on a line, check the Changes tab, approve from the admin account, and check the public page and its byline. Then open an invite link signed out and signed in. This was run on 2026-11-15 over HTTP (26 checks, all passing); the client-side buttons have not yet been clicked through in a browser.

## Not built yet

- Notifications (email or in-app): authors learn about feedback by opening the review.
- Editing or deleting comments, threaded replies to a line comment, resolving comments.
- Renaming usernames.
- Pagination: the review page loads every revision of the post (each file up to 200 KB).
- A native review of the Spanish copy.
- Playwright tests of the review pages.
