# Local Supabase setup (test login and uploads without touching production)

Status (2026-11-15): **done**. Steps 1 to 5 are complete (local stack running, `.env.local` pointing at it, admin account `@KarinDev`), and the review workflow of step 6 has been tested. Nothing here touches the hosted project `mdstore-prod`: the local stack is a separate database that exists only on this machine.

Why: `.env.local` does not exist yet, so the dev server runs without Supabase (login and the upload form are unavailable). This setup points it at a local stack instead. The commands are PowerShell/mise friendly; run them from the project root.

## How the pieces fit

- **Docker Desktop** creates a small Linux VM (WSL 2) on this PC and runs containers in it. It has nothing to do with Supabase's cloud.
- **`npx supabase start`** asks Docker to start the local stack (Postgres, auth, API, Studio) and applies `supabase/migrations/` on the first start.
- **`.env.local`** tells the Next.js app which Supabase to talk to. Change it and restart `npm run dev` to switch between local and hosted.

## Steps

Mark each step done in this list as you go.

1. **Install and start Docker Desktop.**
   - Run the installer. When it asks to install WSL, accept (or run `wsl --install` in an administrator PowerShell), then **restart the PC**.
   - Open Docker Desktop and wait until it says the engine is running.
   - Check with `docker --version`; it must print a version. Open a new terminal first so it sees the updated PATH.
2. **Start the local Supabase stack.** `npx supabase start`. The first run downloads images and takes a few minutes. It prints the local API URL and keys; `npx supabase status` shows them again.
3. **Create `.env.local`** from `.env.example` with the local values:

   ```text
   NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<the publishable key printed by supabase start>
   ```

4. **Run the app and create an account.** `npm run dev`, open `http://localhost:3000/login` and sign up (email, `@username` and password). A user created in the hosted dashboard doesn't exist here: the two databases share nothing. Local email confirmation is off in `supabase/config.toml`, so you are signed in at once. If you turn confirmation on, the emails arrive at `http://127.0.0.1:54324`.
5. **Make that account a local admin.** The local database has no admins (the `mdstore-prod` admin does not carry over). In the local Studio, `http://127.0.0.1:54323`, open the SQL Editor and run, with your own email:

   ```sql
   insert into public.admins (user_id) select id from auth.users where email = 'your-email@example.com';
   ```

6. **Test the flow** (details in [`review-workflow.md`](review-workflow.md)).
   - Post from `/upload`: it should say "Sent for review" and appear under "Your submissions" as pending, with an "Open review" link.
   - Open the post's page and its review (`/prompts/<slug>/review`) as the author, and as an admin. In a private window (signed out) both should be a 404.
   - As the admin, open `/reviews`, pick the post and approve it from the decision form at the bottom of the Conversation tab: the public page goes live. Direct `update`s from the API are no longer allowed.
   - To test co-authors, sign up a second account in a private window and add it by `@username` (or open an invite link from the review's sidebar there).

## Useful commands

- `npx supabase migration up`: apply new migrations to the local database, keeping its data.
- `npx supabase db reset`: rebuild the local database from the migrations (wipes local data, including accounts and the admin row).
- `npm run db:test`: run the pgTAP tests in `supabase/tests/` against the local stack.
- Local emails (if confirmation is on): `http://127.0.0.1:54324`. Studio: `http://127.0.0.1:54323`.
- `npx supabase stop`: shut the stack down.
- `npm run db:push` targets the local stack by default; add `-- --remote` for the hosted project (it asks for confirmation on production).

## Known limits

- The database functions of the review workflow have pgTAP tests; the pages have no browser (Playwright) tests yet.
- The project is linked to `mdstore-prod`: commands that take `--linked` or `--remote` touch production. Everything above runs against the local stack only.
- The Spanish copy added for the review workflow was written without a native review.
