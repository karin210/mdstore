# Routing, 404 pages and safe redirects

How to name routes, handle unknown URLs, redirect safely and protect privileged pages. Follow it whenever you add or rename a route, build a not-found or no-access page, write a redirect, or guard a page by role.

- **The codebase wins.** If the project already has route guards or an error page, extend them, don't mix two, and mention the difference.
- **Client guards are only UX.** Every privileged page and endpoint also checks authentication and role on the server.
- **Never leave the user on a blank screen,** a spinner or a raw error.

## 1. Always ship a custom 404 page

- A branded not-found page that uses the site's layout, design tokens and typography. It explains that the page doesn't exist and offers a clear way back: a link or button to the home page or the user's main view.
- Never leave the framework's default error screen.
- Wire it as the catch-all for unknown routes, and make sure it returns a real `404` status, not a `200`.
- Give it its own page title (see the page titles listing).

## 2. Redirect unknown routes safely

When a user navigates to a route that doesn't exist, show the 404 page, or redirect to a sensible fallback such as the home page or the dashboard when that is the better experience.

**Redirect targets are internal paths only.** Any `redirect` or `next` query parameter must be validated against an allow-list or a same-origin relative path: it starts with a single `/`, never `//` and never a full URL. Otherwise it is an open-redirect vulnerability.

```ts
export function safeRedirect(target: string | null | undefined, fallback = "/"): string {
  if (!target || !target.startsWith("/") || target.startsWith("//") || target.includes("\\")) return fallback;
  return target;
}
```

## 3. Kick users out of privileged pages on logout

Pages that require a role or privilege (admin, staff, dashboard, account) are guarded by a route guard or middleware that checks the signed-in user's role on every navigation.

- **Watch the auth state reactively.** When the user logs out, their session expires or their role is revoked while they sit on a privileged page, redirect them immediately to the login or home page.
- **Use `replace`, not `push`,** so the Back button can't return to the protected page.
- **Clear privileged data** held in client state or stores.

## 4. Enforce on the server too

Every privileged API route and server-rendered page independently verifies authentication and role, and answers `401` or `403`. Never rely on the client redirect alone.

## 5. Unauthorized is not "not found"

- An unauthenticated user hitting a protected route goes to login, optionally preserving a validated return path.
- A signed-in user who lacks the required role gets a branded `403` or "no access" view, or a redirect to their allowed home. Never the protected content.

## 6. Name routes for what the page contains

A route name must say what the page shows and be specific enough that it can't collide with other pages, sections or components. Avoid broad names (`/components`, `/items`, `/data`, `/info`, `/content`, `/list`): they stop working as soon as a second kind of the same thing appears, and they make every class, file and link derived from them vague too.

- **Follow the established convention first.** When the kind of page has a standard name, use it even if it is short: `/services` or `/menu`, `/login`, `/contact`, `/about`, `/pricing`, `/cart`, `/profile`. The specific items are listed inside the page.
- **Invent a name only when no convention exists,** derived from the page's content and purpose: the word that names what the visitor does or sees there (`/showcase` for a page that shows demos), in the site's language and in kebab-case.

## 7. Checklist

- A branded 404 exists and returns a real `404`.
- Redirect parameters are validated as same-origin relative paths.
- Privileged pages have a route guard, react to logout and clear privileged state.
- The server re-checks authentication and role, and answers `401` or `403`.
- Route names describe their content and follow the standard conventions.
