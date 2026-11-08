# Paid content implementation plan

Status: draft, to be refined. Nothing here is implemented yet.

## Goal

Deliver paid `.md` prompts to buyers (including through a CLI that installs them straight into an agent's directory, like skills.sh) while protecting the sellers' intellectual property as far as is realistically possible.

## Core principle

**Once delivered, a plaintext `.md` cannot be protected.** The AI tool has to read the file in the buyer's repo, so encryption or obfuscation is pointless. Any buyer can copy it.

So the strategy is not DRM. It is:

1. Protect the **delivery path** (only paying accounts can fetch the file).
2. Make leaks **traceable** (per-buyer watermarking).
3. Make leaks **actionable** (license terms, bans, takedowns).
4. Make **buying better than copying** (updates, curation, output previews).

We accept that a determined buyer can copy a file. Most buyers won't, and a few leaks cost less than a delivery model that is harder to use.

## Components

### 1. Authenticated delivery

- Paid files are never in `public/`, never in a static or cacheable path and never read into a page (existing rule).
- A server endpoint (e.g. `GET /api/prompts/[slug]/file`) checks, in order: authenticated (`401`), owns an entitlement for this listing (`403`), then returns the file.
- Responses for paid files are `Cache-Control: private, no-store`.
- Optionally return a short-lived signed URL instead of the body.
- Free listings keep using `/prompts/[slug]/download`.

### 2. CLI

- `npx mdstore add <slug>`: installs the file into the right agent directory (e.g. `.claude/commands/`, `.cursor/rules/`, `AGENTS.md`), chosen by flag or detection.
- Free listings: fetched directly from the download route.
- Paid listings: requires login first.
- `npx mdstore login`: device-code flow. The CLI shows a code, the user approves it in the browser, the CLI stores a token (OS keychain where possible, otherwise a user-only file).
- `npx mdstore update`: checks installed files against the latest version and pulls updates for entitled accounts only.
- The CLI is a thin client over the same API the website uses. No logic lives only in the CLI.

### 3. Per-buyer watermarking

Applied at download time, per request, never stored pre-stamped.

- **Visible license header**, e.g. `<!-- Licensed to <buyer-id> · see mdstore license -->`.
- **Invisible fingerprint**: zero-width characters and/or small deterministic wording variations unique per buyer.
- Store a record `(purchase id, buyer id, file version, fingerprint, timestamp)` so a leaked copy can be matched to an account.
- Tell buyers in the terms that files are watermarked. The purpose is deterrence.

### 4. License terms

- Single-user (or per-seat) license: unlimited personal and client projects, **no redistribution, resale or republishing**.
- Shown on the listing page, in the checkout and in the file header.
- Defines consequences: account suspension and takedown requests.

### 5. Abuse friction

- Rate limit downloads per account and per IP.
- Cap re-downloads per purchase and log every download.
- Flag unusual patterns (e.g. one account fetching many files in a short time).

### 6. Value that a leak does not include

- Future versions flow only to entitled accounts (`mdstore update`).
- Output previews, curation, seller reputation and support stay on the platform.

## Out of scope / rejected

- **Encrypting or obfuscating the `.md`**: the agent needs plaintext, so it adds complexity without real protection.
- **Hosted MCP server serving the prompt at runtime**: protects slightly more, but breaks "drop the `.md` in your repo", and the text still ends up in the agent's context. Possible future premium tier, not the default.

## Prerequisites (not built yet)

- Authentication (accounts, sessions, API tokens).
- Checkout and an `entitlements` / purchases model.
- Versioning of listing files (needed for `update`).

## Suggested order

1. Auth and accounts.
2. Purchases and entitlements.
3. Authenticated download endpoint for paid files (with `401`/`403`/`404` handling and `no-store`).
4. Watermarking and the downloads log.
5. License text on listings and in file headers.
6. CLI: `login`, then `add`, then `update`.
7. Rate limiting and abuse flags.

## Open questions

- Single-user vs per-seat licensing, and pricing implications?
- Which agent directories does `add` support at launch, and how are they detected?
- Which invisible fingerprint scheme survives copy-paste and light edits best?
- How many re-downloads per purchase are reasonable?
- Where are tokens stored on each OS, and how does the user revoke them?
- Do sellers see watermark/leak reports, or only the platform?
