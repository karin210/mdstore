# Web project conventions

Baseline conventions for any website or web app, whatever the framework. Apply them to every file you create or change.

- **The codebase wins.** If the project already follows a different convention, keep it, don't mix the two, and mention the difference.
- **Readability wins.** If a rule here makes the code more complex than the problem needs, choose the simplest readable solution.
- **Write in the project's language.** UI copy, error messages and route names use the site's language.

## 1. Principles

- **Simplest readable implementation first.** Only trade readability for performance when the difference is significant and measurable.
- **SOLID, as far as it stays simple:**
  - **Single responsibility:** each module, component or function has one reason to change. Split data fetching from rendering, and validation from presentation.
  - **Open/closed:** extend units through props, slots, composition or configuration instead of editing their internals.
  - **Liskov substitution:** every implementation of a shared contract can replace another without breaking callers.
  - **Interface segregation:** prefer small, focused props and interfaces. Callers should not depend on fields they don't use.
  - **Dependency inversion:** inject dependencies (API clients, storage, clock, logger) instead of hard-wiring them, so they can be swapped or mocked.
  - Never add layers, abstractions or indirection only to satisfy a principle.
- **Model objects with behaviour as classes.** When an object carries rules (validation, state transitions, derived values), such as a form, a booking or an async state, make it a class that owns its fields, validation, getters (`isValid`, `canCancel`) and transitions (`submit()`, `reset()`), plus `fromRecord()` / `toPayload()` conversions. Keep these classes framework-agnostic and unit-testable. Behaviour-free data (API responses, list items, config) stays a plain type. Never send a class instance over the wire; send `toPayload()`.

## 2. Project structure

- **Routes hold routes only.** The routing folder contains pages, layouts and route handlers. Components, utilities and data live elsewhere.
- **Every component sits in a folder.** Use a folder per page or route for components only that page uses, `global/` for components that several pages share (move a component there as soon as a second page imports it), and feature folders (`auth/`, `modals/`, `checkout/`) for one feature's parts.
- **Separate files by role:** `components/`, `data/` (static catalogues), `utils/` (pure, stateless helpers), `validation/` (shared rules), `types/`, `styles/`.
- **Share what the client and the server both need** (core types, validation schemas) from one shared folder, so both sides run the same rules.
- **Static files** (favicon, icons, images, `robots.txt`) go in the public/static folder served as-is, never inside the routing folder.
- **Imports use path aliases** (`@/…`, `#lib/…`), never relative `../` paths.
- **Keep platform code at the edges.** Wrap each browser API, device capability or third-party SDK (storage, clipboard, notifications, payments, analytics) in exactly one module behind a small interface, and inject it into the core. Domain logic and most components never import a platform API directly, so replacing a library changes one file.

## 3. HTML

- **Use semantic elements:** `header`, `nav`, `main`, `section`, `article`, `aside`, `footer`, `figure`, lists for lists. Never use a `div` where a semantic element fits.
- **Prefer native interactive elements** over custom ones: `button` for actions, `a` for navigation, `details`/`summary` for disclosures, `dialog` for modals, real `input`/`select` controls. Build a custom widget only when no native element covers the interaction.
- **Use `data-*` attributes for state and behaviour, classes for styling only.** Flags that scripts or templates read (`data-state="open"`, `data-variant="compact"`) are attributes. When CSS must react to them, select the attribute (`[data-state="open"]`) instead of toggling a class. Prefer the ARIA attribute when one already describes the state (`aria-pressed`, `aria-expanded`, `aria-current`).

## 4. Accessibility (WCAG 2.1 AA)

- Every component meets WCAG 2.1 AA: semantic markup, keyboard operability, visible focus and sufficient contrast (4.5:1 for text, 3:1 for large text, icons, borders and focus indicators).
- Every interactive element is reachable and usable with the keyboard, in a logical tab order.
- Never remove `:focus-visible` outlines. Style them with the focus token instead.
- Content images get a descriptive `alt`. Decorative images and icons get `alt=""` and `aria-hidden="true"`.
- Icon-only buttons get an `aria-label` and a `title`.
- Colour is never the only cue. Pair it with text, an icon or an ARIA state.
- Announce dynamic changes (results, errors, loading) with `role="status"` or `aria-live="polite"`.
- Respect `prefers-reduced-motion` by calming or removing animations, transitions and shimmer.

## 5. Styles

### Tokens

- **Every colour is a CSS custom property on `:root`,** referenced by token. Never use raw hex values in components.
- **Four semantic colour roles:**
  - `--color-background`: the page background, a tinted off-white (light) or deep charcoal/navy (dark). Marketing sites may use a brand colour instead.
  - `--color-primary`: the brand colour, used for the header, footer and key calls to action.
  - `--color-secondary`: complements the primary with less visual weight, used for cards, section backgrounds, helper buttons and pagination.
  - `--color-tertiary`: a high-contrast accent reserved for warnings, helper tools and toasts.
- Add supporting tokens as needed (ink, surface, border, focus, success, error), and define the dark theme by redefining the same tokens under `prefers-color-scheme: dark`.
- **Avoid pure black and pure white** for backgrounds and body text:
  - **Light mode:** off-white or slate backgrounds (`#F8F9FA`, `#F4F6F8`), so white cards stand out without heavy shadows. Text is a high-contrast off-black (`#0F172A`, `#111827`).
  - **Dark mode:** deep charcoal or navy (`#121212`, `#0F172A`), which reduces halation and eye strain. Text is off-white (`#F8FAFC`, `#E4E4E7`).
- **Tint neutrals toward the brand** instead of using pure greys.
- **Sizes are tokens too.** Font sizes use `clamp()` tokens (`--text-sm` … `--text-3xl`). Spacing uses `clamp()` tokens (`--space-*`). Fixed `px` sizes are only for fine one-off details (hairline borders, icon nudges).

```css
:root {
  --color-background: #f4f6f8;
  --color-primary: #3b3fd8;
  --color-secondary: #e8e7fb;
  --color-tertiary: #f2665a;
  --color-ink: #111827;
  --text-base: clamp(1rem, 0.95rem + 0.25vw, 1.125rem);
  --space-m: clamp(1rem, 0.8rem + 1vw, 1.5rem);
}
```

### Layout

- **Fluid layout:** use `clamp()`, relative units (`rem`, `%`, `vw`/`vh`) and custom properties. Never give layout containers fixed pixel widths. Cap the reading width with a token (`--content-width`).
- **Separate sections with `gap` on the parent,** not with margins or padding on the children.
- **Use `box-sizing: border-box`,** mandatory on wrappers and on every direct child of `body`, and recommended everywhere.
- **Apply `position: absolute` to a wrapper, never to individual siblings.** Taking one child out of the flow forces its siblings to follow. Wrap the group that must float together and position the wrapper, so the children keep their normal flow inside it. If elements end up hidden behind an absolutely positioned sibling, fix it the same way.

### Interaction

- Suppress the mobile tap highlight globally with `-webkit-tap-highlight-color: transparent` on `button`, `a` and `[role="button"]`, while keeping `:focus-visible` outlines.
- Keep global styles (tokens, reset, typography, shared classes) in one global stylesheet loaded once at the root. Scope everything else to its component.

## 6. Typography

- **Page titles and section headings** use the most styled display font, which carries the brand identity.
- **Modal headings** use a plainer font, because modals carry important information that must read easily.
- **Body copy and UI controls** use the most sober, legible font.

## 7. Buttons

Choose a button's kind by the job it does, not by where it sits. Its look follows from the kind.

- **Primary:** the main calls to action tied to buying (the hero CTA, "Buy", "Book now"). It has its own component, and its size may vary with context.
- **Secondary:** purchase follow-ups, acquisition (sign in, sign up), the main operational actions of a dashboard, and contact. It has its own component.
- **Tertiary:** informational triggers, contextual actions and settings, all without purchase intent.
- **Interface:** UI controls rather than tasks (menu toggle, back to top, carousel arrows).

## 8. Images

- **Never show content images raw.** Apply a treatment (a `brightness`/`contrast`/`saturate` filter, a colour overlay or a subtle vignette) so the image looks intentional. Icons are exempt.
- **Text over an image must stay legible.** Put a gradient overlay, a darkening or blurring filter, or a semi-transparent scrim between the image and the text.
- Reserve the image's space with `width`/`height` or `aspect-ratio` to avoid layout shift.

## 9. Modals

Every modal is one of two types, chosen by whether closing it is a meaningful decision:

- **Non-dismissible:** for modals that ask for a considered decision, usually opened by the user (create, edit or delete a record, disable a setting).
  - It closes **only** through explicit, action-named buttons ("Cancel", "Save", "Delete"). No outside click, no Escape and no X button.
  - It always offers a "Cancel".
  - With a native `<dialog>`, set `closedby="none"`. With a custom overlay, don't wire up outside-click or Escape.
- **Dismissible:** for modals with no important decision, usually opened by the system (a permission prompt, a date picker, an image viewer). It closes with an outside click, with Escape and with a floating X button, all three.
- **Shared styling lives in the global stylesheet,** never redefined per component:
  - `.modal-title`: the heading.
  - `.modal-input`: the inputs and selects inside a modal.
  - `.modal-close-floating`: the dismissible X, floating just outside the container's top-right corner. The container must be positioned.
  - `.modal-actions`: the button row of a non-dismissible modal, right-aligned with `justify-content: flex-end`, buttons at content width.
  - `.modal-btn`, plus `.modal-btn-primary` (filled) or `.modal-btn-cancel` (outlined).

## 10. Forms

- **Validate every field:** required values, formats and field-specific rules.
- **Each field has one guidance text,** treated as a single thing whether it explains what is expected or what is wrong. Render it inline, directly under the field, never in a toast, popup or bubble. Keep it always in the DOM (empty and `hidden` when there is nothing to say), link it with `aria-describedby`, make it `aria-live="polite"`, and set `aria-invalid` on the field while the guidance shows an error.
- **Validate as the user types,** once the field has been edited. Don't wait for blur or submit, and never flag a pristine field the user only tabbed through. Show only the rules still unmet, written as actions ("Add a number", "Use at least 8 characters"), and clear the text the moment the value is valid.
- **Mark the field with its border and focus ring, not by recolouring its text.** After blur, a wrong non-empty value gets an error border and a valid value a success border. Empty or untouched fields keep the default border. While focused, the state moves to the `:focus-visible` ring.
- **Never use the amber/warning colour for validation.** Use the error and success tokens.
- **Keep the submit button visible and enabled.** Disable it only while a submission is in flight, and keep its width stable when its label changes.
- **On an invalid submit, don't send.** Mark every field as edited so each error shows, and move focus to the first invalid field.
- **Passwords:**
  - Sign-up accepts any browser-generated password. Require only 8+ characters with a lowercase letter, an uppercase letter and a digit, allow any other non-space character, never require a symbol or restrict symbols to a list, and allow at least 64 characters (`/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)\S{8,}$/`).
  - Sign-in checks only that the password is filled in.
  - Set `autocomplete="new-password"` on sign-up, `current-password` on sign-in and `username` on the email field.
- **Define each rule once** in the shared validation module so the client and the server accept exactly the same values.

## 11. Loading, empty and error states

- **Every async operation has a visible state:** fetches, submissions, mutations, uploads, auth calls and lazy content. Track an explicit status (`idle | loading | success | error`) instead of inferring it from empty data, ideally in one reusable async-state class or hook whose `run()` always clears loading in `finally`.
- **Match the loader to the content:**
  - **Content areas** get skeletons that mirror the final layout.
  - **Small actions** get an inline spinner.
  - **Measurable work** (uploads) gets a determinate progress bar.
  - **Async content** gets reserved space (`aspect-ratio`, `min-height`) so the page doesn't jump.
- **Buttons show their in-flight state** ("Saving…" and/or a spinner) and are disabled until the request finishes.
- **Don't flash on fast responses.** Delay the loader by about 150–300 ms, then keep it visible for a minimum time once shown.
- **Handle all four outcomes:** loading, success, empty (a helpful message and a next step) and error (a clear message and a retry action).
- **Make loading accessible:** set `aria-busy="true"` on the updating region and announce results with `role="status"`. Build loaders as reusable components styled with tokens.

## 12. Page titles

- **Every page gets a unique, meaningful `<title>`** in the format `Page name | App name`. Define the app name and separator once (a title template) so pages only supply their own part.
- **The home page** may lead with the brand: `App name | Short descriptor`.
- **Detail pages** include the item's name, updated when the data loads. Show `Loading… | App name` meanwhile, never `undefined`.
- **Error and system pages** get their own titles (`Page not found | App name`).
- **Set titles per page,** so they are correct on the server render and on every client-side navigation. Keep them under about 60 characters, and pair public pages with a meta description.

## 13. Routing and navigation

- **Ship a branded 404 page** that uses the site's layout, explains that the page doesn't exist and links back home. Wire it as the catch-all, and make it return a real `404` status, never a `200`.
- **Allow internal redirects only.** Validate any `redirect`/`next` parameter as a same-origin relative path (it starts with a single `/`, never `//` or a full URL).
- **Guard privileged pages** (account, dashboard, admin) with a route guard that checks the user's role on every navigation. Watch the auth state as well: on logout, session expiry or role loss, redirect with `replace` and clear privileged client state.
- **Unauthenticated users go to login** (optionally with a validated return path). **Signed-in users without the role** get a branded "no access" view or their allowed home.
- **Name routes for their content.** Use the conventional name when one exists (`/login`, `/contact`, `/about`, `/pricing`, `/cart`, `/services`). Otherwise derive a specific kebab-case name from what the page shows. Avoid generic names (`/items`, `/data`, `/info`) that stop making sense once a second kind of thing appears.

## 14. Server: validation, authorization and errors

- **Never trust the client.** Client checks are only UX. Every endpoint, form action and server function re-validates all input: bodies, query strings, route params, headers, cookies and files. Check presence, type, format, length, allowed values and file type/size, and reject unknown fields. Use a schema (Zod, Valibot) shared with the client, and use only the parsed result.
- **Authenticate, then authorize, on every request.** Call a reusable guard at the top of each handler (`requireUser`, `requireRole`, `requireOwnerOrAdmin`). Check that the caller may perform this action on this specific resource, to prevent IDOR.
- **Take authority only from trusted sources.** User IDs, roles, prices and ownership come from the verified session and the database, never from the request. Deny by default.
- **Cover every path:** all HTTP methods, bulk operations, downloads, subscriptions and server-rendered pages. Hiding a button in the UI is cosmetic; ask "what if someone calls this endpoint directly?"
- **Return the correct status code,** never `200` with an error in the body:
  - **Success:** `200` (read/update), `201` (created), `202` (queued), `204` (no content).
  - **Client errors:** `400` (malformed), `401` (not signed in), `403` (not allowed; use `404` if revealing the resource exists is sensitive), `404`, `409` (conflict, e.g. duplicate email), `422` (fails validation), `429` (rate limited, with `Retry-After`).
  - **Server errors:** `500` (unexpected), `502`/`503`/`504` (upstream or availability).
- **Never leak internals.** Database errors, stack traces, file paths, schema names and third-party payloads never reach the client.
  - Map known failures to clear messages (duplicate key → `409` "An account with this email already exists").
  - Send everything else as a generic `500` with a request ID.
  - Never forward `error.message` in a response.
  - Use one consistent error body: `{ message, fieldErrors?, requestId? }`.
- **Log the full error server-side** with the route, method, user ID and request ID, but never passwords, tokens or full personal data.
- **Keep auth errors vague** where enumeration matters ("Incorrect email or password").
- **Sanitize and parameterize:** parameterized queries, escaped HTML output, and values normalized (trimmed, emails lowercased) before storing.
- **On the client,** check `response.ok` before using the body, and branch on the status:
  - `401` → sign in.
  - `403` → no-access view.
  - `404` → not-found state.
  - `409`/`422` → show the field message.
  - `429`/`5xx` → retry with backoff.
  - Show the server's safe message, never a raw error.

## 15. TypeScript and JavaScript

- End statements with semicolons.
- Give every exported function an explicit return type.
- Never use `any`. Use `unknown` and narrow it, or write the real type.
- Put types shared by the client and the server in the shared folder, and keep UI-only and server-only types on their own side.
