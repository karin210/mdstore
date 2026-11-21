# Authentication

Status (2026-11-21). How people sign up, sign in and manage their account on mdstore. Who can do what once signed in is in [`roles-and-access.md`](roles-and-access.md); the tables and policies are in [`database.md`](database.md); running Supabase locally is in [`local-supabase-setup.md`](local-supabase-setup.md).

Authentication is Supabase Auth with email and password (`@supabase/ssr` + `@supabase/supabase-js`). There are no social logins, magic links or password reset yet. Without the `NEXT_PUBLIC_SUPABASE_*` settings (`src/lib/supabase/env.ts`) the site builds and runs signed out: every action answers `notConfigured` and the header shows only "Sign in".

## Pages and code

| Piece               | Where                                                                        | What it does                                                                                                    |
| ------------------- | ---------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Login page          | `src/app/[locale]/login/page.tsx`, `components/login/`                       | Sign-up / sign-in tabs. Reads `?next=`, `?mode=` and `?error=` from the URL, so `LoginPanel` is in `<Suspense>` |
| Sign-up and sign-in | `src/server/auth/actions.ts` (`signUp`, `signIn`)                            | Server actions: validate, call Supabase, redirect                                                               |
| Email link landing  | `src/app/[locale]/auth/confirm/route.ts`                                     | Turns the emailed link into a session                                                                           |
| Session refresh     | `src/proxy.ts` + `src/server/supabase/refreshSession.ts`                     | Renews the auth cookies on every request and gates the account pages                                            |
| Who is signed in    | `src/server/auth/getSignedInUser.ts`                                         | The verified user (`id`, `email`) or `null`                                                                     |
| Header control      | `components/shared/AccountControl`                                           | "Sign in" / "Profile" + "Sign out"; signs out in the browser                                                    |
| Account changes     | `src/server/profiles/actions.ts`, `components/profile/`                      | Username, email and password changes from `/profile`                                                            |
| Validation          | `src/lib/validation/` (`credentials.ts`, `username.ts`, `accountChanges.ts`) | One set of rules for the forms (client) and the actions (server, as Zod schemas)                                |
| Supabase clients    | `src/server/supabase/`, `src/lib/supabase/browserClient.ts`                  | Server client reads the session cookies; browser client is used only for sign-out and auth-change events        |

## Sign up

1. The form asks for email, `@username` and password. The client checks them with the rules in `src/lib/validation/`; the action parses the same rules with `signUpSchema`, so both accept the same values.
2. The action checks that the username is free (`is_username_taken`) so the form can say so, then calls `supabase.auth.signUp` with `emailRedirectTo` = `/auth/confirm?next=<path>` (in the visitor's language) and the username as user metadata (`data: { username }`).
3. The database trigger `on_auth_user_created` runs `create_profile_for_new_user()`, which turns that metadata into the user's `profiles` row. It skips a taken or malformed name instead of failing the sign-up; the app then asks the user to pick one before they can post (`set_username`).
4. If the Supabase project requires email confirmation (the default; off in the local stack), no session starts and the form shows "check your email". With it off, the user is signed in and redirected at once.
5. An email that already has an account also answers "check your email": Supabase hides that on purpose, so the form can't be used to find out who is registered.

### Rules

| Field    | Rule                                                                                                                                                           |
| -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Email    | `name@domain.tld`, at most 254 characters, trimmed and lowercased before use                                                                                   |
| Password | 8 to 72 characters, no spaces, at least one lowercase letter, one uppercase letter and one digit. Any other character is allowed. 72 is bcrypt's limit         |
| Username | 2 to 39 characters of `A-Z a-z 0-9 . _ -`; a leading `@` is accepted and dropped. Unique ignoring case. The database has the same check on `profiles.username` |

The sign-up password rule accepts every password a browser or password manager suggests. The form can also suggest one (`generateSuggestedPassword`). **Sign-in only checks that a password was typed**: older accounts may predate the sign-up rules.

## Sign in

`signIn` validates, calls `signInWithPassword` and redirects to the `next` path. Supabase's known failures become user-safe messages (`toAuthError`): `invalid_credentials`, `email_not_confirmed`, `email_exists` / `user_already_exists`, and the two rate-limit codes. Anything else is logged with `logServerError`, and the form shows an error with a request id the user can quote.

### Return path (`next`)

Every redirect after signing in goes through `getSafeRedirectPath` (`src/lib/safeRedirect.ts`): only a same-site relative path is accepted (one leading `/`, no `//`, `/\` or scheme); anything else becomes `/upload`. This is what keeps `?next=` from being an open redirect. Keep using it for any new redirect that takes a path from the URL or a form.

## Email links: `/auth/confirm`

One route serves every email Supabase sends (sign-up confirmation, and email change). It accepts both link formats:

- `?token_hash=…&type=…` (custom email template) → `verifyOtp`; `type` must be one of `signup, invite, magiclink, recovery, email_change, email`.
- `?code=…` (the default PKCE link) → `exchangeCodeForSession`.

On success the session starts and the user goes to the safe `next` path. On any failure (missing parameters, expired or used link, Supabase not configured) they go to `/login?error=confirm`, which shows a message.

In the Supabase dashboard, the **Site URL** and the **redirect allow-list** must include the site's origin (production: `siteConfig.url` in `src/lib/site.ts`, local: `http://localhost:3000`), or Supabase rejects `emailRedirectTo`.

## Sessions

- The session lives in cookies set by `@supabase/ssr`. Server Components can't write cookies, so `src/proxy.ts` calls `refreshSupabaseSession` on every request (the matcher skips `/api`, `_next` and files with an extension). It calls `getClaims()`, which verifies the token and refreshes it when needed, and writes the renewed cookies to the request (for this render) and the response (for the browser). Nothing may run between creating that client and `getClaims()`.
- Responses that set auth cookies get the cache headers `@supabase/ssr` provides, so they are never cached and served to someone else.
- **Trust the verified token, not the cookie.** Server code gets the user from `getSignedInUser()`, which uses `getClaims()` (signature checked). Never read the user from the raw session cookie on the server.
- **Sign out** happens in the browser (`AccountControl`), which clears the cookies. The header also listens to `onAuthStateChange` and refreshes the server-rendered page on `SIGNED_IN` / `SIGNED_OUT`, also across tabs, so the upload form disappears when the session ends. This is only UI: every server action re-checks the session.

## Protected pages

`/profile` and `/my-prompts` need a session. Two layers (the third, the database, is in [`roles-and-access.md`](roles-and-access.md)):

1. **Proxy:** a signed-out visitor is redirected (a real redirect) to `/login?next=/profile` (or `/my-prompts`), in their language. A locale redirect from next-intl goes first, so the login page opens in the right language.
2. **Page:** `require_account_profile()` redirects to `/login` if the session ended between the proxy and the render.

Posting (`/upload`) is open to look at; the form is replaced by "Sign in to post" for visitors, and the post action re-checks the session (`get_signed_in_user`). Row-level security only accepts rows whose `author_id` is the caller.

## Account changes (`/profile`)

All three are server actions in `src/server/profiles/actions.ts` and re-check the session first.

| Change   | How                                                                                                                                                                                                                                                                                                                     |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Username | First one: `set_username` (accounts from before usernames existed). Rename: `change_username()` in the database, which checks the name and a **30-day cool-down** (`USERNAME_CHANGE_COOLDOWN_DAYS`) and rewrites the handle on the user's posts. Public pages cache bylines, so the action refreshes them (`updateTag`) |
| Email    | `supabase.auth.updateUser({ email })` with `emailRedirectTo` back to `/auth/confirm?next=/profile`. Nothing changes until the user opens the link sent to the new address (and, with "secure email change" on, the one sent to the current address)                                                                     |
| Password | The current password is checked first by signing in again, so an open session on a shared computer isn't enough to take over the account; then `updateUser({ password })`. The new one follows the sign-up rules and must differ from the current one                                                                   |

## Errors

Actions return a result object instead of throwing, and the forms translate its `errorKey` / `error_key` from `src/i18n/locales/{en,es}/auth.json`:

- `invalid`: field-level guidance (`fieldErrors`, or `field` + `guidance_key`); the form focuses the first wrong field.
- `error`: `invalidCredentials`, `emailNotConfirmed`, `emailTaken`, `rateLimited`, `unauthenticated`, `notConfigured`, `server` (with a `requestId` from `logServerError`), plus a few per action (`tooSoon`, `alreadySet`, `sameEmail`, …).
- `checkEmail`: a link was sent; the form says where.

Database errors from `change_username()` are mapped by code: `MD409` or `23505` (taken), `MD422` (format), `MD429` (cool-down), `MD428` (no username yet), `MD401` / `42501` (not signed in).

## Adding or changing something

- **A new auth action:** put it in `src/server/auth/` or `src/server/profiles/`, validate with a Zod schema from `src/lib/validation/` (the same rules the form uses), re-check the session on the server, return a result object, and add the messages to both `auth.json` files.
- **A new protected page:** add its first path segment to `ACCOUNT_PAGES` in `src/proxy.ts` and call `require_account_profile()` in the page. Update the table in [`roles-and-access.md`](roles-and-access.md).
- **A new email link type:** point its `emailRedirectTo` at `/auth/confirm`; add the `type` to `EMAIL_OTP_TYPES` if it isn't there.
- **A change to password rules:** change `credentials.ts` only (client and server share it) and check that Supabase's own minimum in the dashboard isn't stricter, or `weak_password` appears.

## Not built yet

- Password reset ("forgot password"): the `recovery` link type is accepted by `/auth/confirm`, but no page asks for or sets the new password.
- Resending the confirmation email.
- Social logins, magic links, MFA.
- Deleting an account.
