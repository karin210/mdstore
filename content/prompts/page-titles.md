# Page titles

How to give every page a meaningful, unique title. Follow it whenever you create a page or a route, change what a page shows, or set up the title mechanism of a project.

- **The codebase wins.** If the project already has a title template or helper, extend it, don't mix two, and mention the difference.
- **Never ship a default title.** Not the framework default, not an empty title, not a filename, and not the same title on every route.
- **Write in the user's language,** in plain sentence or title case, with no keyword stuffing.
- **Re-read this file in long sessions.** If the conversation has been compacted or summarised, or you've been working for a long stretch, re-read this file before the next change and check your work against it.

## 1. Why it matters

The title appears in the browser tab, the history, bookmarks, search results and screen-reader announcements, so it has to say where the user is. It must describe the page's purpose (WCAG 2.4.2) and change on every route navigation, including client-side transitions.

## 2. The format

Use `Page name | App name` (or `Page name - App name`). Pick one separator per project and use it everywhere:

```text
Pricing | Acme
Login | Acme
Dashboard | Acme
```

- The specific page comes first so it stays visible when the tab is truncated. The app name comes last.
- **The home page may lead with the brand** and a short descriptor instead (`Acme | Book appointments online`), but it must still be set on purpose.

## 3. Detail pages

- Include the item's name on dynamic routes: `Blue Ceramic Vase | Acme`, `Booking #1042 | Acme`.
- Update the title reactively when the data loads. Use a sensible placeholder such as `Loading… | Acme` while it is fetching, never `undefined | Acme`.

## 4. Special pages

Error and system pages get their own titles: `Page not found | Acme`, `No access | Acme`. So do full-screen views that behave like modals, and each step of a multi-step flow where it helps orientation.

## 5. Define the app name once

Keep the app name and the separator in a single constant or title template, so pages only provide their own part and the format can't drift. Most frameworks have a hook for this (a `titleTemplate`, a metadata template, a shared head helper).

```ts
const appName = "Acme";
const titleTemplate = (pageTitle?: string): string => (pageTitle ? `${pageTitle} | ${appName}` : appName);
```

## 6. Set it per page, not globally

Each page sets its own title with the framework's mechanism, so it is also correct on server render and static generation, not only after the page hydrates.

## 7. Keep it short, and pair it with a description

- About 60 characters or fewer.
- On public pages, add a matching meta description that says what the page offers, written for people and not for keyword counts.

## 8. Checklist

- Every route has a title of its own, in the format `Page | App`.
- Dynamic pages include the item name and never show `undefined`.
- Error, no-access and flow-step pages have titles.
- The app name and separator live in one place.
- The title changes on client-side navigation too.
