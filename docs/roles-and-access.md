# Roles and access

Status (2026-11-19). Who can do what on mdstore, and where each rule is enforced. The details of the review workflow are in [`review-workflow.md`](review-workflow.md); the tables, functions and policies are in [`database.md`](database.md).

## Roles

The app has two levels of roles: one for the whole site, and one per post.

### Site-wide

| Role           | Who                                  | How it is known                                                                 |
| -------------- | ------------------------------------ | ------------------------------------------------------------------------------- |
| Visitor        | anyone who isn't signed in           | no valid Supabase session                                                       |
| Signed-in user | anyone with an account and a session | `getClaims()` verifies the session token (`src/server/auth/getSignedInUser.ts`) |
| Admin          | a signed-in user listed in `admins`  | the database function `is_admin()`                                              |

- **`admins`** is a table of user ids. Row-level security is on and it has no policies, so the API can neither read nor write it: admins are added only with SQL, in the Supabase SQL editor (see [`database.md`](database.md) for the hosted project and [`local-supabase-setup.md`](local-supabase-setup.md) for the local stack). There is no admin page.
- **`is_admin()`** returns whether the caller is in `admins`. It is a `security definer` function, so it can read the table for the caller without exposing it. Every admin check in the app and the database calls it.
- A signed-in user without a `@username` (an account from before usernames existed) is asked to pick one before posting, commenting or joining a post.

### Per post (`post_authors.role`)

| Role      | Who                                                                                                                    |
| --------- | ---------------------------------------------------------------------------------------------------------------------- |
| Owner     | whoever posted it (set by the `start_post_review` trigger)                                                             |
| Co-author | named by the owner on the upload form (username search), added by @username from the review, or through an invite link |

"Author" below means either of them. Admins are not authors of a post unless they are added as one.

## What each role can do

| Action                                                    | Visitor | Signed-in user | Co-author | Owner | Admin |
| --------------------------------------------------------- | :-----: | :------------: | :-------: | :---: | :---: |
| Browse approved prompts, download free ones, use the API  |   yes   |      yes       |    yes    |  yes  |  yes  |
| Post a prompt (`/upload`), preview it (`/upload/preview`) |         |      yes       |    yes    |  yes  |  yes  |
| Profile and my prompts (`/profile`, `/my-prompts`)        |         |      yes       |    yes    |  yes  |  yes  |
| Search usernames (co-authors on the upload form)          |         |      yes       |    yes    |  yes  |  yes  |
| See a post that isn't approved yet, and its review        |         |                |    yes    |  yes  |  yes  |
| Push a new revision                                       |         |                |    yes    |  yes  |       |
| Comment on a review or a line                             |         |                |    yes    |  yes  |  yes  |
| Suggest a change to lines of the file                     |         |                |    yes    |  yes  |  yes  |
| Accept or reject suggested changes                        |         |                |    yes    |  yes  |       |
| Approve, request changes or reject                        |         |                |           |       |  yes  |
| Withdraw the review in progress                           |         |                |           |  yes  |       |
| Add a co-author, create an invite link                    |         |                |           |  yes  |       |
| Remove a co-author                                        |         |                |           |  yes  |       |
| Leave the post                                            |         |                |    yes    |       |       |
| Rate an approved post (1 to 5 stars), change or remove it |         |      yes       |           |       |  yes  |
| See the review queue (`/reviews`)                         |         |                |           |       |  yes  |

- Comments and decisions need a review in progress (`open` or `changes_requested`); closed reviews are read-only for everyone.
- An admin may decide on their own post: the site has a single admin for now.
- Ratings: a post's owner and co-authors can't rate it (`rate_prompt()` raises `MD403`); everyone else who is signed in rates other people's posts, admins included. Each rating is private to its author; the public sees the average and the count.

## Where access is enforced

Each rule is checked in up to three layers. The database is the one that matters: the other two only give visitors the right status code and page.

1. **Proxy** (`src/proxy.ts`), before rendering:
   - `/prompts/[slug]/review` answers the branded 404, with a real 404 status, to visitors who are neither authors nor admins (`postReviewVisibleToRequest`).
   - `/reviews` answers the same 404 to everyone who isn't an admin (`isAdminRequest`, which calls `is_admin()` as the visitor). The page's existence isn't revealed.
   - A pending post's public page (`/prompts/[slug]`) answers 404 to everyone but its authors and the admins (`postedPromptVisibleToRequest`).
   - `/profile`, `/my-prompts` and `/upload/preview` redirect signed-out visitors to `/login`, which brings them back after signing in.
   - The lookup helpers are in `src/server/prompts/postedPromptExists.ts`. When a lookup itself fails (not "no", but an error), the proxy lets the request through rather than show a misleading 404; the page then decides.
2. **Page**, while rendering:
   - `/reviews`: `get_review_queue()` (`src/server/reviews/reviewQueue.ts`) calls `is_admin()` again and the page answers `notFound()` unless it returns true.
   - The review page: `get_review_page()` returns nothing when row-level security hides the reviews, and the page answers `notFound()`. It also decides which forms to show (`viewer.role`, `viewer.is_admin`).
   - `/profile` and `/my-prompts`: `require_account_profile()` redirects to `/login` if the session ended after the proxy ran.
3. **Database** (the source of truth):
   - **Row-level security** hides pending posts, reviews, revisions and comments from everyone but the post's authors and the admins, so the data stays private even if a check above were skipped.
   - **Every write** in the review workflow is a `security definer` function that checks the caller and the review's state: `push_revision` (authors), `add_review_comment` (authors and admins, also for suggestions), `apply_suggestions` and `reject_suggestion` (authors), `decide_review` (admins), `withdraw_review`, `add_post_coauthor`, `create_post_invite` (owner), `remove_post_author` (owner, or the co-author themselves), `change_username` (the caller's own profile), `rate_prompt` (signed-in readers who aren't the post's authors, approved posts only). They raise `MD401` (not signed in), `MD403` (not allowed) and `MD404` (not found, also used when the caller may not see it).
   - Server actions re-check the session before calling them (for example `get_signed_in_profile()` in `src/server/prompts/actions.ts`).

## Changing roles

- **Make someone an admin:** run `insert into public.admins (user_id) select id from auth.users where email = '<their email>';` in the SQL editor of the right project (hosted or local). Remove them with `delete from public.admins where user_id = ...`.
- **Add a new site-wide role:** model it like `admins` (a table with RLS and no policies, plus a `security definer` check function), use the function in the policies and write functions that need it, and add the proxy and page checks only for the status code and the UI. Update this file and the table above.
