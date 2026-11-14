# Server security: validation and authorization

How to protect server code that handles input, accounts and data: check every input on the server, check that the caller may do exactly what they ask, and keep secrets out of the repository and the client. Follow it whenever you write or review an API route, a form action, a server function, a file upload or anything that reads or changes protected data.

- **The codebase wins.** If the project already has a validation layer or an authorization guard, extend it, don't mix two, and mention the difference.
- **Client checks are only UX.** Anyone can bypass a form attribute, a disabled button or a hidden menu item with devtools, `curl` or a modified client. The server decides.
- **Deny by default.** An endpoint is closed unless a rule explicitly allows the caller in.
- **Re-read this file in long sessions.** If the conversation has been compacted or summarised, or you've been working for a long stretch, re-read this file before the next change and check your work against it.

## 1. Check against the OWASP Top 10

Before writing or reviewing code that handles input, authentication, sessions, data access, file uploads or third-party content, check it against the current OWASP Top 10: broken access control, injection, cryptographic failures, insecure design, security misconfiguration, vulnerable components, authentication failures, integrity failures, logging failures and server-side request forgery. The rules below are the project-level application of it.

## 2. Secrets stay out of the repository and the client

- Keep secrets in environment files that are git-ignored. Commit only an `.env.example` with the names and no values.
- Only variables meant for the browser get the framework's public prefix.
- Run the package manager's audit (for example `npm audit`) when adding dependencies and before releases.

## 3. Validate everything that crosses the boundary

- **Re-validate on the server** all incoming input, even when the client already validated the same data.
- **Cover every channel,** not only form fields: request bodies, query strings, route params, headers, cookies and uploaded files.
- **Check** presence, type, format, length or range, allowed values (enums) and, for files, type and size. **Reject unknown or extra fields** rather than passing them through.
- **Use a schema,** shared with the client where possible (Zod, Valibot or the equivalent), kept in a shared folder so both sides run the same rules. Parse into typed data and use only the parsed result downstream, never the raw input.
- **Normalise before storing or comparing:** trim, lowercase emails, and so on.
- **Parameterise and escape.** Use parameterised queries or the ORM's methods for all database access, and escape or sanitise anything rendered as HTML.
- **Fail closed with useful errors.** On invalid input answer `400` or `422` with field-level messages the client can show next to the right field, without leaking internals. Log the details on the server.

## 4. Never take authority from the client

- Don't accept user IDs, roles, prices, totals, permissions or ownership flags from the request body, query, headers or cookies. Derive them on the server from the verified session or token and from the database.
- Read roles and permissions only from trusted sources: verified token claims or the database. Never from `{ isAdmin: true }`, `role=admin` or a `userId` field the user can edit.

## 5. Authorize on the server, on every path

- **Authenticate first, then authorize.** Verify the identity, then check the permission for the specific action on the specific resource. Never assume a request is legitimate because it came from your own frontend.
- **Check ownership and role on every resource access,** not only "is the user logged in". A user may delete their own booking; only an admin may delete other users. Prevent IDOR: never fetch or mutate a record by an ID from the URL or body without verifying the caller's right to it.
- **Use a reusable guard** called at the top of each handler (`requireUser`, `requireRole(event, 'admin')`, `requireOwnerOrAdmin(event, resource)`), so no route can forget one.
- **Cover every action path:** all HTTP methods (GET, POST, PATCH, DELETE), bulk and batch operations, file downloads, WebSocket and listener subscriptions, and server-rendered pages.
- **Return the right status:** `401` when the caller isn't authenticated, `403` when they are but lack permission, and `404` where revealing that a resource exists is itself sensitive.
- **Let the UI mirror the server, not replace it.** Hide or disable actions the user can't perform, driven by the same role data the server enforces, and treat that as cosmetic only.

## 6. The question to ask of every endpoint

"What happens if someone calls this directly, with another user's ID, or without the button?" If the answer isn't a clean `401`, `403` or `404`, the endpoint isn't finished.

## 7. Checklist

- Every input is validated on the server with a schema, and unknown fields are rejected.
- No identity, role, price or ownership value is taken from the client.
- Each handler starts with a guard that authenticates and then authorizes the specific resource.
- All methods, bulk operations, downloads and subscriptions are covered.
- Queries are parameterised, output is escaped, and secrets are not in the repository or the client bundle.
