# Next.js project structure

Where every file goes in a Next.js App Router project (TypeScript). Follow it when you scaffold the project, add a feature, or decide where a new file belongs.

- **The codebase wins.** If the project already has an established structure, follow it, don't mix the two, and mention the difference.
- **Create folders when they are needed.** Don't scaffold empty folders "for later".
- **Check the installed version.** Next.js changes conventions between major versions. Read the docs that ship in `node_modules/next/dist/docs/` before relying on an API you remember, and heed deprecation notices.
- **Re-read this file in long sessions.** If the conversation has been compacted or summarised, or you've been working for a long stretch, re-read this file before the next change and check your work against it.

## 1. The tree

```text
project/
├─ src/
│  ├─ app/                      routes only
│  │  ├─ layout.tsx             root layout: fonts, global CSS, title template, header/footer
│  │  ├─ layout.module.css      styles for the markup the layout itself renders, if any
│  │  ├─ not-found.tsx          branded 404 for every unmatched URL
│  │  ├─ error.tsx              branded error boundary
│  │  ├─ (homepage)/page.tsx    the home page, served at "/"
│  │  ├─ pricing/page.tsx       one folder per route, named for what the page shows
│  │  ├─ products/[slug]/       dynamic segment: page.tsx, loading.tsx
│  │  └─ api/<domain>/route.ts  route handlers, grouped by domain (auth/, bookings/, admin/)
│  ├─ components/
│  │  ├─ homepage/              components only the home page uses
│  │  ├─ <route>/               components only that route uses (pricing/, products/)
│  │  ├─ shared/                components used by several pages or components
│  │  └─ <feature>/             one feature's parts (auth/, checkout/, modals/)
│  ├─ hooks/                    client hooks (useAuth.ts, useMediaQuery.ts)
│  ├─ data/                     static data and catalogues
│  ├─ lib/                      pure helpers, classes (forms, async state) and site config
│  ├─ validation/               schemas shared by the client and the server
│  ├─ types/                    shared types (core records used on both sides)
│  ├─ server/                   server-only code: auth guards, database, services
│  ├─ styles/                   globals.css (tokens, reset, typography, no classes) plus
│  │                            shared, page-level and heavy *.module.css files
│  ├─ proxy.ts                  request proxy (route guards, redirects), next to app/
│  └─ instrumentation.ts        optional: monitoring and tracing
├─ public/                      static files served as-is (favicon.ico, images, robots.txt)
├─ next.config.ts, tsconfig.json, package.json, eslint.config.mjs
├─ .env.local                   secrets, never committed
└─ CLAUDE.md / AGENTS.md        project notes for coding agents
```

## 2. `src/` and the project root

- **Application code lives in `src/`.** Configuration stays in the root: `package.json`, `next.config.ts`, `tsconfig.json`, `eslint.config.mjs` and the `.env*` files.
- **Don't keep both layouts.** If `app/` exists in the root, Next.js ignores `src/app/`.
- **`proxy.ts` and `instrumentation.ts` sit inside `src/`,** at the same level as `app/`.
- **Commit `.env.example`, never `.env*` files** with real values.

## 3. `src/app/` holds routes only

- **Only routing files go here:** `page`, `layout`, `loading`, `error`, `not-found`, `route`, `template`, `default` and metadata files (`sitemap.ts`, `robots.ts`, `opengraph-image.tsx`).
- **Keep components, hooks, utilities and data out of `app/`,** even though Next.js allows colocating them or putting them in `_private` folders. One rule ("app is routes") is easier to follow than "app is routes, plus whatever is safe to colocate".
- **Put the home page in a `(homepage)` route group,** so it sits in its own folder and is still served at `/`. Use other route groups (`(marketing)`, `(dashboard)`) to share a layout between routes without adding a URL segment.
- **Name each route folder for what its page contains,** in kebab-case and in the site's language. Use the conventional name when one exists (`login`, `contact`, `about`, `pricing`, `cart`, `services`). Avoid generic names (`items`, `data`, `info`).
- **Never put a `page` and a `route` in the same folder.** They conflict.
- **Group route handlers by domain** under `app/api/` (`api/auth/`, `api/bookings/`, `api/admin/`). Keep each handler thin: parse and validate the input, call a guard and a service from `src/server/`, and return the right status code.
- **Special files:**
  - `not-found.tsx`: the branded 404, which returns a real `404` status.
  - `error.tsx`: the branded error boundary, with a retry action. Add `global-error.tsx` for errors in the root layout.
  - `loading.tsx`: a skeleton that mirrors the segment's layout, for each segment that waits on data.

## 4. `src/components/`

- **No loose files in `components/`.** Every component sits in a folder:
  - `homepage/` for components only the home page uses.
  - A folder named after the route (`pricing/`, `products/`) for components only that route uses.
  - `shared/` for components that several pages or components import (header, footer, buttons, logo). Never call it `global`: that word belongs to `globals.css`.
  - Feature folders (`auth/`, `checkout/`, `modals/`) for the parts of one feature.
- **Promote a component to `shared/` as soon as a second page or component imports it.**
- **One folder per component, named after it.** Every file under `components/` lives in a folder named after the file, at any depth: `components/homepage/PromptCard/PromptCard.tsx`, exporting `PromptCard`, with its stylesheet beside it (`PromptCard.module.css`) when the project uses CSS Modules. This holds for files that export several components (`shared/icons/icons.tsx`) and for plain helpers next to components. The pair moves and gets deleted together.
- **Server Components are the default.** Add `"use client"` only to the components that need state, effects, event handlers or browser APIs, and keep those client components as small as possible, close to the leaves of the tree.

## 5. Everything else under `src/`

- **`hooks/`:** client hooks, named `use*.ts`. A hook holds stateful logic that relies on React (state, effects, context). Stateless logic belongs in `lib/`.
- **`data/`:** static data and catalogues (`countries.ts`, `faq.ts`, `navLinks.ts`).
- **`lib/`:** framework-agnostic code that runs on both sides:
  - pure helpers (`formatPrice.ts`, `formatDate.ts`)
  - classes for objects with rules (`SignUpForm`, `AsyncState`, `Booking`)
  - site config (`site.ts`: app name, title template, contact details)
- **`validation/`:** the schemas (Zod, Valibot) that both the client and the server run, so they accept exactly the same values.
- **`types/`:** core record types shared by the client and the server (`BookingRecord`, `UserRecord`). Keep a type next to its only consumer when nothing else uses it (component props stay in the component file).
- **`server/`:** code that must never reach the browser: auth guards (`requireUser`, `requireRole`), database access, services that call third-party APIs with secrets. Start each file with `import "server-only";` so an accidental client import fails the build.
- **Style files live in exactly three places:** the component's own folder (including those under `components/shared/`), the route's own folder in `app/` (a `page.module.css` or `layout.module.css` beside the file it styles), and `src/styles/`. No `shared/` stylesheet folder inside a feature, no stylesheet sitting loose in a feature folder. Anything used by more than one component or route goes to `src/styles/`, as a module.
- **`styles/globals.css` holds no classes.** It is for the `:root` tokens, the reset, typography and element-level defaults, imported **once**, at the top of the root layout. Never write a component's or a feature's class in it, so templates never mix plain class names with module classes: every class comes from a CSS Module (`styles.card`). If it grows long, split it into `tokens.css`, `reset.css` and `typography.css` pulled in with `@import`, so the layout still imports one file. Never import it anywhere else.
- **`src/styles/` also holds modules, named for what they style,** imported through the alias (`@/styles/review.module.css`):
  - **Shared modules:** styles several components of one feature use (`review.module.css`: card, muted text, buttons).
  - **Page-level modules:** the layout of a page (grid, columns, sidebar), named for the page (`reviewPage.module.css`), for when the page body and its other parts, such as its loading skeleton, share the same layout classes.
  - **Heavy modules:** styles that cost load or render time, such as complicated animations or large effects (`heroAnimation.module.css`). Import them only where used, so they load with that component and not on every page.
  A style used by only one component stays in that component's own module.
- **State stores** (Zustand, Redux, Jotai), when the project needs them, go in `src/stores/`, one file per domain. Keep a fetch in the component that uses it when no other component needs the data.

## 6. Static files: `public/`

- **Every file served as-is goes in the root `public/` folder,** never in `src/app/`. That covers the favicon, icons, images, fonts you self-host, `robots.txt` and downloadable files.
- **Move the scaffold's `app/favicon.ico` to `public/favicon.ico`,** and declare it in the root layout so the `<link rel="icon">` tag is still emitted:

```ts
export const metadata: Metadata = {
  icons: { icon: "/favicon.ico" },
};
```

- **Files that must not be public** (paid downloads, private templates) never go in `public/`. Keep them in a root folder such as `content/`, and serve them through a route handler that checks access first.

## 7. Imports

- **Use the `@/*` alias, mapped to `src/*`,** and never relative `../` paths:

```json
{
  "compilerOptions": {
    "paths": { "@/*": ["./src/*"] }
  }
}
```

- **Import from the module that owns the code** (`@/components/shared/SiteHeader/SiteHeader`). Don't add barrel `index.ts` files that re-export a whole folder: they hide where code lives and can pull server code into client bundles.

## 8. Page titles and metadata

- **Define the app name and the title format once** in `src/lib/site.ts`, and apply it in the root layout:

```ts
export const metadata: Metadata = {
  title: { template: "%s | AppName", default: "AppName" },
};
```

- **Each page exports its own `metadata`** (or `generateMetadata` for dynamic routes, using the item's name) with only its part of the title.
- **The home page** uses `title: { absolute: "AppName | Short descriptor" }` to lead with the brand.

## 9. Route protection

- **`src/proxy.ts`** redirects unauthenticated visitors away from privileged routes before they render. It is a convenience, not the security boundary.
- **Every route handler, server action and privileged page** still checks the session and the role itself, through the guards in `src/server/`. Never rely on the proxy or on a hidden button alone.

## 10. Keep the project notes current

- **Maintain a `CLAUDE.md` (or `AGENTS.md`) in the root** with the project description, stack, commands and this structure as it actually exists.
- **Update it in the same change** that adds a route, a top-level folder or a convention, so the next agent starts from the truth.
